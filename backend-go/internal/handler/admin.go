package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/middleware"
)

func RegisterAdmin(rg *gin.RouterGroup, jwtSecret string, db *pgxpool.Pool) {
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	rg.GET("/dashboard", auth, admin, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{}})
	})

	rg.GET("/users", auth, admin, func(c *gin.Context) {
		rows, err := db.Query(c.Request.Context(),
			`SELECT id, email, role, is_active, created_at FROM users ORDER BY created_at DESC`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var users []gin.H
		for rows.Next() {
			var id, email, role string
			var isActive bool
			var createdAt interface{}
			_ = rows.Scan(&id, &email, &role, &isActive, &createdAt)
			users = append(users, gin.H{"id": id, "email": email, "role": role, "isActive": isActive, "createdAt": createdAt})
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": users})
	})

	rg.GET("/metrics", auth, admin, func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": middleware.GetMetrics()})
	})

	// GET /admin/products — product management list
	rg.GET("/products", auth, admin, func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
		if page < 1 { page = 1 }
		if limit < 1 || limit > 100 { limit = 20 }
		offset := (page - 1) * limit

		search := c.Query("search")
		categoryID := c.Query("categoryId")
		status := c.Query("status")

		where := "WHERE 1=1"
		args := []interface{}{}
		i := 1

		if search != "" {
			where += ` AND (p.name ILIKE $` + strconv.Itoa(i) + ` OR p.brand ILIKE $` + strconv.Itoa(i) + `)`
			args = append(args, "%"+search+"%")
			i++
		}
		if categoryID != "" {
			where += ` AND EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = $` + strconv.Itoa(i) + `)`
			args = append(args, categoryID)
			i++
		}
		if status == "active" {
			where += " AND p.is_active = true"
		} else if status == "inactive" {
			where += " AND p.is_active = false"
		}

		var total int
		_ = db.QueryRow(c.Request.Context(), `SELECT COUNT(*) FROM products p `+where, args...).Scan(&total)

		args = append(args, limit, offset)
		rows, err := db.Query(c.Request.Context(),
			`SELECT p.id, p.name, p.slug, p.brand, p.images, p.is_active, p.created_at,
			        COALESCE((SELECT MIN(price) FROM price_entries pe WHERE pe.product_id = p.id AND pe.is_available=true), 0) as min_price,
			        (SELECT COUNT(*) FROM price_entries pe WHERE pe.product_id = p.id) as price_count
			 FROM products p `+where+
				` ORDER BY p.created_at DESC LIMIT $`+strconv.Itoa(i)+` OFFSET $`+strconv.Itoa(i+1),
			args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var products []gin.H
		for rows.Next() {
			var id, name, slug string
			var brand *string
			var images []string
			var isActive bool
			var createdAt interface{}
			var minPrice float64
			var priceCount int
			_ = rows.Scan(&id, &name, &slug, &brand, &images, &isActive, &createdAt, &minPrice, &priceCount)
			products = append(products, gin.H{
				"id": id, "name": name, "slug": slug, "brand": brand,
				"images": images, "isActive": isActive, "createdAt": createdAt,
				"minPrice": minPrice, "priceCount": priceCount,
			})
		}
		if products == nil {
			products = []gin.H{}
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"products": products,
				"pagination": gin.H{
					"page": page, "limit": limit,
					"total": total, "totalPages": (total + limit - 1) / limit,
				},
			},
		})
	})

	// PATCH /admin/products/:id — toggle active
	rg.PATCH("/products/:id", auth, admin, func(c *gin.Context) {
		var body struct {
			IsActive *bool `json:"isActive"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if body.IsActive != nil {
			_, _ = db.Exec(c.Request.Context(),
				`UPDATE products SET is_active=$1, updated_at=NOW() WHERE id=$2`, *body.IsActive, c.Param("id"))
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	// DELETE /admin/products/:id
	rg.DELETE("/products/:id", auth, admin, func(c *gin.Context) {
		_, err := db.Exec(c.Request.Context(),
			`UPDATE products SET is_active=false, updated_at=NOW() WHERE id=$1`, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	// POST /admin/products/bulk — bulk status update
	rg.POST("/products/bulk", auth, admin, func(c *gin.Context) {
		var body struct {
			IDs      []string `json:"ids"`
			IsActive *bool    `json:"isActive"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if body.IsActive != nil && len(body.IDs) > 0 {
			_, _ = db.Exec(c.Request.Context(),
				`UPDATE products SET is_active=$1, updated_at=NOW() WHERE id = ANY($2)`,
				*body.IsActive, body.IDs)
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "updated": len(body.IDs)})
	})

	// GET /admin/config
	rg.GET("/config", auth, admin, func(c *gin.Context) {
		row := db.QueryRow(c.Request.Context(),
			`SELECT config_data FROM website_config ORDER BY updated_at DESC LIMIT 1`)
		var configData interface{}
		if err := row.Scan(&configData); err != nil {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": configData})
	})

	// PUT /admin/config
	rg.PUT("/config", auth, admin, func(c *gin.Context) {
		var body map[string]interface{}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		_, err := db.Exec(c.Request.Context(),
			`INSERT INTO website_config (config_data, updated_at) VALUES ($1, NOW())
			 ON CONFLICT DO UPDATE SET config_data=$1, updated_at=NOW()`, body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})
}
