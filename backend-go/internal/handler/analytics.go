package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/middleware"
)

func RegisterAnalytics(rg *gin.RouterGroup, jwtSecret string, db *pgxpool.Pool) {
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	rg.POST("/track", func(c *gin.Context) {
		var body struct {
			EventType string                 `json:"eventType" binding:"required"`
			ProductID string                 `json:"productId"`
			Metadata  map[string]interface{} `json:"metadata"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		_, _ = db.Exec(c.Request.Context(),
			`INSERT INTO user_interactions (event_type, product_id, metadata, created_at)
			 VALUES ($1, NULLIF($2,''), $3, NOW())`,
			body.EventType, body.ProductID, body.Metadata)
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	rg.GET("/stats", auth, admin, func(c *gin.Context) {
		var totalViews, totalSearches int
		_ = db.QueryRow(c.Request.Context(),
			`SELECT COUNT(*) FROM user_interactions WHERE event_type = 'product_view'`).Scan(&totalViews)
		_ = db.QueryRow(c.Request.Context(),
			`SELECT COUNT(*) FROM search_queries`).Scan(&totalSearches)
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    gin.H{"totalViews": totalViews, "totalSearches": totalSearches},
		})
	})

	// GET /analytics/reports?days=7  (used by /admin dashboard)
	rg.GET("/reports", auth, admin, func(c *gin.Context) {
		days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))
		if days <= 0 {
			days = 7
		}

		var totalPageViews, totalSearches, uniqueSessions int
		_ = db.QueryRow(c.Request.Context(),
			`SELECT COUNT(*) FROM user_interactions
			 WHERE event_type = 'page_view' AND created_at > NOW() - ($1 || ' days')::interval`, days).Scan(&totalPageViews)
		_ = db.QueryRow(c.Request.Context(),
			`SELECT COUNT(*) FROM search_queries
			 WHERE last_searched_at > NOW() - ($1 || ' days')::interval`, days).Scan(&totalSearches)
		_ = db.QueryRow(c.Request.Context(),
			`SELECT COUNT(DISTINCT metadata->>'sessionId') FROM user_interactions
			 WHERE created_at > NOW() - ($1 || ' days')::interval`, days).Scan(&uniqueSessions)

		// Popular products
		rows, _ := db.Query(c.Request.Context(),
			`SELECT product_id, COUNT(*) as view_count FROM user_interactions
			 WHERE event_type = 'product_view' AND product_id IS NOT NULL
			   AND created_at > NOW() - ($1 || ' days')::interval
			 GROUP BY product_id ORDER BY view_count DESC LIMIT 10`, days)
		var popularProducts []gin.H
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var pid string
				var cnt int
				_ = rows.Scan(&pid, &cnt)
				popularProducts = append(popularProducts, gin.H{"productId": pid, "viewCount": cnt})
			}
		}
		if popularProducts == nil {
			popularProducts = []gin.H{}
		}

		// Search trends
		trows, _ := db.Query(c.Request.Context(),
			`SELECT keyword, search_count FROM search_queries
			 WHERE last_searched_at > NOW() - ($1 || ' days')::interval
			 ORDER BY search_count DESC LIMIT 10`, days)
		var searchTrends []gin.H
		if trows != nil {
			defer trows.Close()
			for trows.Next() {
				var kw string
				var cnt int
				_ = trows.Scan(&kw, &cnt)
				searchTrends = append(searchTrends, gin.H{"query": kw, "searchCount": cnt})
			}
		}
		if searchTrends == nil {
			searchTrends = []gin.H{}
		}

		now := time.Now()
		c.JSON(http.StatusOK, gin.H{
			"generatedAt": now,
			"period": gin.H{
				"start": now.AddDate(0, 0, -days),
				"end":   now,
				"days":  days,
			},
			"summary": gin.H{
				"totalPageViews": totalPageViews,
				"totalSearches":  totalSearches,
				"uniqueSessions": uniqueSessions,
			},
			"popularProducts": popularProducts,
			"searchTrends":    searchTrends,
		})
	})

	// GET /analytics/system-performance  (used by /admin dashboard)
	rg.GET("/system-performance", auth, admin, func(c *gin.Context) {
		var productCount, priceEntryCount int
		_ = db.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM products WHERE is_active=true`).Scan(&productCount)
		_ = db.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM price_entries`).Scan(&priceEntryCount)

		c.JSON(http.StatusOK, gin.H{
			"metrics": []gin.H{
				{"metricName": "active_products", "metricValue": productCount, "unit": "count"},
				{"metricName": "price_entries", "metricValue": priceEntryCount, "unit": "count"},
			},
			"errorRate":       0,
			"avgResponseTimeMs": 0,
		})
	})

	// GET /analytics/popular-products
	rg.GET("/popular-products", auth, admin, func(c *gin.Context) {
		rows, err := db.Query(c.Request.Context(),
			`SELECT product_id, COUNT(*) as view_count FROM user_interactions
			 WHERE event_type = 'product_view' AND product_id IS NOT NULL
			 GROUP BY product_id ORDER BY view_count DESC LIMIT 20`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var results []gin.H
		for rows.Next() {
			var pid string
			var cnt int
			_ = rows.Scan(&pid, &cnt)
			results = append(results, gin.H{"productId": pid, "viewCount": cnt})
		}
		if results == nil {
			results = []gin.H{}
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
	})

	// GET /analytics/search-trends
	rg.GET("/search-trends", auth, admin, func(c *gin.Context) {
		rows, err := db.Query(c.Request.Context(),
			`SELECT keyword, search_count FROM search_queries ORDER BY search_count DESC LIMIT 20`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var results []gin.H
		for rows.Next() {
			var kw string
			var cnt int
			_ = rows.Scan(&kw, &cnt)
			results = append(results, gin.H{"keyword": kw, "searchCount": cnt})
		}
		if results == nil {
			results = []gin.H{}
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
	})
}
