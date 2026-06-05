package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/crawler"
	"github.com/ssco/backend/internal/middleware"
)

func RegisterGadget(rg *gin.RouterGroup, db *pgxpool.Pool) {
	// GET /gadget/brands
	rg.GET("/brands", func(c *gin.Context) {
		rows, err := db.Query(c.Request.Context(),
			`SELECT id, name, slug, logo_url, country, sort_order FROM gadget_brands WHERE is_active = true ORDER BY sort_order, name`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var brands []gin.H
		for rows.Next() {
			var id, name, slug string
			var logoURL, country *string
			var sortOrder int
			_ = rows.Scan(&id, &name, &slug, &logoURL, &country, &sortOrder)
			brands = append(brands, gin.H{
				"id": id, "name": name, "slug": slug,
				"logoUrl": logoURL, "country": country,
			})
		}
		if brands == nil {
			brands = []gin.H{}
		}
		c.JSON(http.StatusOK, brands) // frontend expects plain array
	})

	// GET /gadget/brands/:slug/devices
	rg.GET("/brands/:slug/devices", func(c *gin.Context) {
		row := db.QueryRow(c.Request.Context(),
			`SELECT id, name, slug FROM gadget_brands WHERE slug = $1`, c.Param("slug"))
		var bID, bName, bSlug string
		if err := row.Scan(&bID, &bName, &bSlug); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "brand not found"})
			return
		}
		rows, err := db.Query(c.Request.Context(),
			`SELECT id, name, slug, image_url, is_published FROM gadget_devices
			 WHERE brand_id = $1 AND is_published = true ORDER BY name`, bID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var devices []gin.H
		for rows.Next() {
			var id, name, slug string
			var imageURL *string
			var isPublished bool
			_ = rows.Scan(&id, &name, &slug, &imageURL, &isPublished)
			devices = append(devices, gin.H{
				"id": id, "name": name, "slug": slug, "imageUrl": imageURL,
				"brandSlug": bSlug,
			})
		}
		if devices == nil {
			devices = []gin.H{}
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"brand": gin.H{"id": bID, "name": bName, "slug": bSlug},
			"devices": devices,
		}})
	})

	// GET /gadget (list all published devices)
	rg.GET("", func(c *gin.Context) {
		rows, err := db.Query(c.Request.Context(),
			`SELECT d.id, d.name, d.slug, d.image_url, d.category, b.name, b.slug
			 FROM gadget_devices d
			 JOIN gadget_brands b ON b.id = d.brand_id
			 WHERE d.is_published = true ORDER BY d.name`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var devices []gin.H
		for rows.Next() {
			var id, name, slug, category, brandName, brandSlug string
			var imageURL *string
			_ = rows.Scan(&id, &name, &slug, &imageURL, &category, &brandName, &brandSlug)
			devices = append(devices, gin.H{
				"id": id, "name": name, "slug": slug, "imageUrl": imageURL,
				"category": category, "brand": brandName, "brandSlug": brandSlug,
			})
		}
		if devices == nil {
			devices = []gin.H{}
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": devices})
	})

	// GET /gadget/:brandSlug/:slug
	rg.GET("/:brandSlug/:slug", func(c *gin.Context) {
		row := db.QueryRow(c.Request.Context(),
			`SELECT d.id, d.name, d.slug, d.image_url, d.specs, d.category, b.name, b.slug
			 FROM gadget_devices d JOIN gadget_brands b ON b.id = d.brand_id
			 WHERE d.slug = $1 AND d.is_published = true`, c.Param("slug"))
		var id, name, slug, category, brandName, brandSlug string
		var imageURL *string
		var specs map[string]interface{}
		if err := row.Scan(&id, &name, &slug, &imageURL, &specs, &category, &brandName, &brandSlug); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"id": id, "name": name, "slug": slug, "imageUrl": imageURL,
			"specs": specs, "category": category,
			"brand": brandName, "brandSlug": brandSlug,
		}})
	})
}

func RegisterAdminGadget(rg *gin.RouterGroup, jwtSecret string, db *pgxpool.Pool) {
	cr := crawler.NewGadgetCrawler()
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	// GET /admin/gadget/devices
	rg.GET("/devices", auth, admin, func(c *gin.Context) {
		rows, err := db.Query(c.Request.Context(),
			`SELECT d.id, d.name, d.slug, d.image_url, d.category, d.is_published, d.gsmarena_url, b.name, b.slug
			 FROM gadget_devices d JOIN gadget_brands b ON b.id = d.brand_id
			 ORDER BY d.created_at DESC`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var devices []gin.H
		for rows.Next() {
			var id, name, slug, category, brandName, brandSlug string
			var imageURL, gsmarenaURL *string
			var isPublished bool
			_ = rows.Scan(&id, &name, &slug, &imageURL, &category, &isPublished, &gsmarenaURL, &brandName, &brandSlug)
			devices = append(devices, gin.H{
				"id": id, "name": name, "slug": slug, "imageUrl": imageURL,
				"category": category, "isPublished": isPublished,
				"gsmarenaUrl": gsmarenaURL, "brandName": brandName, "brandSlug": brandSlug,
			})
		}
		if devices == nil {
			devices = []gin.H{}
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"devices": devices}})
	})

	rg.POST("/search", auth, admin, func(gc *gin.Context) {
		var body struct {
			Keyword string `json:"keyword" binding:"required"`
		}
		if err := gc.ShouldBindJSON(&body); err != nil {
			gc.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		results, err := cr.SearchGSMArena(gc.Request.Context(), body.Keyword)
		if err != nil {
			gc.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		gc.JSON(http.StatusOK, gin.H{"success": true, "data": results})
	})

	rg.POST("/crawl", auth, admin, func(gc *gin.Context) {
		var body struct {
			URL string `json:"url" binding:"required"`
		}
		if err := gc.ShouldBindJSON(&body); err != nil {
			gc.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		gadget, err := cr.CrawlGSMArena(gc.Request.Context(), body.URL)
		if err != nil {
			gc.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		gc.JSON(http.StatusOK, gin.H{"success": true, "data": gadget})
	})

	rg.GET("/devices/:id", auth, admin, func(c *gin.Context) {
		row := db.QueryRow(c.Request.Context(),
			`SELECT d.id, d.name, d.slug, d.image_url, d.specs, d.category, d.is_published, d.gsmarena_url, b.name, b.slug
			 FROM gadget_devices d JOIN gadget_brands b ON b.id = d.brand_id WHERE d.id = $1`, c.Param("id"))
		var id, name, slug, category, brandName, brandSlug string
		var imageURL, gsmarenaURL *string
		var specs map[string]interface{}
		var isPublished bool
		if err := row.Scan(&id, &name, &slug, &imageURL, &specs, &category, &isPublished, &gsmarenaURL, &brandName, &brandSlug); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"id": id, "name": name, "slug": slug, "imageUrl": imageURL,
			"specs": specs, "category": category, "isPublished": isPublished,
			"gsmarenaUrl": gsmarenaURL, "brandName": brandName, "brandSlug": brandSlug,
		}})
	})

	rg.POST("/devices/:id/publish", auth, admin, func(c *gin.Context) {
		var body struct {
			Published bool `json:"published"`
		}
		_ = c.ShouldBindJSON(&body)
		_, err := db.Exec(c.Request.Context(),
			`UPDATE gadget_devices SET is_published=$1, updated_at=NOW() WHERE id=$2`, body.Published, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	rg.POST("/devices", auth, admin, func(c *gin.Context) {
		// TODO: save crawled device to DB
		c.JSON(http.StatusCreated, gin.H{"success": true})
	})

	rg.DELETE("/devices/:id", auth, admin, func(c *gin.Context) {
		_, err := db.Exec(c.Request.Context(), `DELETE FROM gadget_devices WHERE id=$1`, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})
}
