package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/cache"
	"github.com/ssco/backend/internal/middleware"
)

func RegisterAffiliate(rg *gin.RouterGroup, jwtSecret string, db *pgxpool.Pool, cs *cache.Service) {
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	rg.GET("/configs", func(c *gin.Context) {
		var configs []interface{}
		key := cache.KeyAffiliateConfigs()
		if hit, _ := cs.Get(c.Request.Context(), key, &configs); hit {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": configs})
			return
		}
		rows, err := db.Query(c.Request.Context(),
			`SELECT id, platform, ref_code, is_active, commission_rate FROM affiliate_configs ORDER BY platform`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var result []gin.H
		for rows.Next() {
			var id, platform string
			var refCode *string
			var isActive bool
			var commissionRate float64
			_ = rows.Scan(&id, &platform, &refCode, &isActive, &commissionRate)
			result = append(result, gin.H{
				"id": id, "platform": platform, "refCode": refCode,
				"isActive": isActive, "commissionRate": commissionRate,
			})
		}
		_ = cs.Set(c.Request.Context(), key, result, cache.TTLAffiliateConfigs)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
	})
	rg.PUT("/configs/:id", auth, admin, func(c *gin.Context) {
		// TODO: update affiliate config + invalidate cache
		c.JSON(http.StatusOK, gin.H{"success": true})
	})
}
