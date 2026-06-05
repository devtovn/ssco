package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/cache"
	"github.com/ssco/backend/internal/middleware"
)

func RegisterAds(rg *gin.RouterGroup, jwtSecret string, db *pgxpool.Pool, cs *cache.Service) {
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	rg.GET("/zones", func(c *gin.Context) {
		var zones []interface{}
		key := cache.KeyAdZones()
		if hit, _ := cs.Get(c.Request.Context(), key, &zones); hit {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": zones})
			return
		}
		rows, err := db.Query(c.Request.Context(),
			`SELECT id, name, slot_key, is_active FROM ad_zones WHERE is_active = true ORDER BY name`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var result []gin.H
		for rows.Next() {
			var id, name, slotKey string
			var isActive bool
			_ = rows.Scan(&id, &name, &slotKey, &isActive)
			result = append(result, gin.H{"id": id, "name": name, "slotKey": slotKey, "isActive": isActive})
		}
		_ = cs.Set(c.Request.Context(), key, result, cache.TTLAdZones)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
	})

	rg.GET("/active", func(c *gin.Context) {
		position := c.Query("position")
		if position == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "position required"})
			return
		}
		row := db.QueryRow(c.Request.Context(),
			`SELECT z.id, z.position, z.dimensions,
			        a.id, a.type, a.content_url, a.script_code, a.click_url
			 FROM ad_zones z
			 JOIN advertisements a ON a.zone_id = z.id
			 WHERE z.position = $1 AND z.is_active = true AND a.is_active = true
			   AND a.start_date <= NOW()
			   AND (a.end_date IS NULL OR a.end_date >= NOW())
			 ORDER BY a.start_date DESC
			 LIMIT 1`, position)

		var zoneID, zonePos string
		var dimensions interface{}
		var adID, adType string
		var contentURL, scriptCode, clickURL *string
		if err := row.Scan(&zoneID, &zonePos, &dimensions, &adID, &adType, &contentURL, &scriptCode, &clickURL); err != nil {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": nil})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"zoneId": zoneID, "position": zonePos, "dimensions": dimensions,
			"adId": adID, "type": adType,
			"contentUrl": contentURL, "scriptCode": scriptCode, "clickUrl": clickURL,
		}})
	})

	rg.GET("/zones/:zoneId/ads", func(c *gin.Context) {
		zoneID := c.Param("zoneId")
		key := cache.KeyAdActive(zoneID)
		var ads []interface{}
		if hit, _ := cs.Get(c.Request.Context(), key, &ads); hit {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": ads})
			return
		}
		rows, err := db.Query(c.Request.Context(),
			`SELECT id, type, content_url, script_code, click_url FROM advertisements
			 WHERE zone_id = $1 AND is_active = true
			   AND start_date <= NOW()
			   AND (end_date IS NULL OR end_date >= NOW())
			 ORDER BY start_date DESC`, zoneID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var result []gin.H
		for rows.Next() {
			var id, adType string
			var contentURL, scriptCode, clickURL *string
			_ = rows.Scan(&id, &adType, &contentURL, &scriptCode, &clickURL)
			result = append(result, gin.H{"id": id, "type": adType, "contentUrl": contentURL, "scriptCode": scriptCode, "clickUrl": clickURL})
		}
		_ = cs.Set(c.Request.Context(), key, result, cache.TTLAdZones)
		c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
	})

	rg.POST("/zones", auth, admin, func(c *gin.Context) {
		// TODO: create ad zone
		c.JSON(http.StatusCreated, gin.H{"success": true})
	})
	rg.PUT("/zones/:id", auth, admin, func(c *gin.Context) {
		// TODO: update ad zone + invalidate cache
		_, _ = cs.DeletePattern(c.Request.Context(), "ads:*")
		c.JSON(http.StatusOK, gin.H{"success": true})
	})
}
