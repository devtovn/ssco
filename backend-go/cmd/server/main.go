package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/ssco/backend/internal/cache"
	"github.com/ssco/backend/internal/config"
	"github.com/ssco/backend/internal/handler"
	"github.com/ssco/backend/internal/middleware"
	"github.com/ssco/backend/internal/queue"
	"github.com/ssco/backend/internal/repository"
	"github.com/ssco/backend/internal/service"
)

func main() {
	cfg := config.Load()

	level := slog.LevelInfo
	if cfg.IsProd() {
		gin.SetMode(gin.ReleaseMode)
	} else {
		level = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))

	// ── Infrastructure (with retry) ──────────────────────────────────────────
	db, err := mustConnectDB(cfg)
	if err != nil {
		slog.Error("db init failed after retries", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	rdb, err := mustConnectRedis(cfg)
	if err != nil {
		slog.Error("redis init failed after retries", "err", err)
		os.Exit(1)
	}
	defer rdb.Close()

	cs := cache.New(rdb)

	// ── Services ──────────────────────────────────────────────────────────────
	authSvc, err := service.NewAuthService(db, rdb,
		cfg.JWTSecret, cfg.JWTRefreshSecret,
		cfg.JWTExpiresIn, cfg.JWTRefreshExpiry)
	if err != nil {
		slog.Error("auth service init failed", "err", err)
		os.Exit(1)
	}

	catRepo := repository.NewCategoryRepo(db)
	catSvc := service.NewCategoryService(catRepo, cs)

	searchRepo := repository.NewSearchRepo(db)
	searchSvc := service.NewSearchService(searchRepo, cs)

	priceRepo := repository.NewPriceRepo(db)
	priceSvc := service.NewPriceService(priceRepo, cs)

	platformAPI := service.NewPlatformAPIService()
	collectionSvc := service.NewDataCollectionService(db, platformAPI)

	// ── Scheduler ─────────────────────────────────────────────────────────────
	if cfg.SchedulerEnabled {
		scheduler := queue.NewScheduler(collectionSvc, cfg.CollectionCron, cfg.CollectionKeywords)
		if err := scheduler.Start(cfg.CollectionCron); err != nil {
			slog.Error("scheduler start failed", "err", err)
		} else {
			defer scheduler.Stop()
		}
	}

	// ── Router ────────────────────────────────────────────────────────────────
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.Metrics())
	r.Use(middleware.ErrorHandler())

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", cfg.CORSOrigin)
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	globalLimiter := middleware.RateLimiter(cs, cfg.RateLimitWindowMs, cfg.RateLimitMaxReq)
	authLimiter := middleware.RateLimiter(cs, cfg.AuthRateLimitWindowMs, cfg.AuthRateLimitMaxReq)
	searchLimiter := middleware.RateLimiter(cs, cfg.SearchRateLimitWindowMs, cfg.SearchRateLimitMaxReq)

	api := r.Group("/api")
	api.Use(globalLimiter)

	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "time": time.Now().UTC()})
	})

	// ── Route groups ──────────────────────────────────────────────────────────
	handler.RegisterAuth(api.Group("/auth"), authLimiter, authSvc, cfg.JWTSecret)
	handler.RegisterCategories(api.Group("/categories"), catSvc, cfg.JWTSecret)
	handler.RegisterSearch(api.Group("/search"), searchLimiter, searchSvc)
	handler.RegisterPrices(api.Group("/products"), priceSvc)
	handler.RegisterDeals(api, priceSvc)
	handler.RegisterAdmin(api.Group("/admin"), cfg.JWTSecret, db)
	handler.RegisterAffiliate(api.Group("/affiliate"), cfg.JWTSecret, db, cs)
	handler.RegisterAds(api.Group("/ads"), cfg.JWTSecret, db, cs)
	handler.RegisterAnalytics(api.Group("/analytics"), cfg.JWTSecret, db)
	handler.RegisterContent(api.Group("/content"), cfg.JWTSecret, db)
	handler.RegisterGadget(api.Group("/gadget"), db)
	handler.RegisterAdminGadget(api.Group("/admin/gadget"), cfg.JWTSecret, db)
	handler.RegisterVouchers(api.Group("/vouchers"), cfg.JWTSecret, db)
	handler.RegisterPublic(api.Group("/public"), db)
	handler.RegisterSeed(api.Group("/admin/seed"), cfg.JWTSecret, collectionSvc, platformAPI)

	r.NoRoute(middleware.NotFound())

	// ── HTTP Server ───────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		slog.Info("server starting", "port", cfg.Port, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-quit
	slog.Info("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "err", err)
	}
	slog.Info("server stopped")
}

// mustConnectDB retries DB connection with exponential backoff (max 60s total).
func mustConnectDB(cfg *config.Config) (*pgxpool.Pool, error) {
	delays := []time.Duration{1, 2, 4, 8, 15, 30}
	var err error
	for i, d := range delays {
		db, e := config.NewDBPool(cfg)
		if e == nil {
			return db, nil
		}
		err = e
		if i < len(delays)-1 {
			slog.Warn("db not ready, retrying", "attempt", i+1, "wait", d, "err", e)
			time.Sleep(d * time.Second)
		}
	}
	return nil, err
}

// mustConnectRedis retries Redis connection with exponential backoff.
func mustConnectRedis(cfg *config.Config) (*redis.Client, error) {
	delays := []time.Duration{1, 2, 4, 8, 15}
	var err error
	for i, d := range delays {
		rdb, e := config.NewRedisClient(cfg)
		if e == nil {
			return rdb, nil
		}
		err = e
		if i < len(delays)-1 {
			slog.Warn("redis not ready, retrying", "attempt", i+1, "wait", d, "err", e)
			time.Sleep(d * time.Second)
		}
	}
	return nil, err
}
