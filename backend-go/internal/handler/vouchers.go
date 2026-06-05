package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/middleware"
)

func RegisterVouchers(rg *gin.RouterGroup, jwtSecret string, db *pgxpool.Pool) {
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	rg.GET("", func(c *gin.Context) {
		platform := c.Query("platform")
		q := `SELECT id, code, platform, description, discount_type, discount_value, min_order_value, expires_at
		      FROM vouchers WHERE is_active = true`
		args := []interface{}{}
		if platform != "" {
			q += " AND platform = $1"
			args = append(args, platform)
		}
		q += " ORDER BY expires_at ASC"

		rows, err := db.Query(c.Request.Context(), q, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var vouchers []gin.H
		for rows.Next() {
			var id, code, platform, discountType string
			var description *string
			var discountValue float64
			var minOrderValue *float64
			var expiresAt interface{}
			_ = rows.Scan(&id, &code, &platform, &description, &discountType, &discountValue, &minOrderValue, &expiresAt)
			vouchers = append(vouchers, gin.H{
				"id": id, "code": code, "platform": platform, "description": description,
				"discountType": discountType, "discountValue": discountValue,
				"minOrderValue": minOrderValue, "expiresAt": expiresAt,
			})
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": vouchers})
	})

	rg.POST("", auth, admin, func(c *gin.Context) {
		// TODO: create voucher
		c.JSON(http.StatusCreated, gin.H{"success": true})
	})
	rg.DELETE("/:id", auth, admin, func(c *gin.Context) {
		_, err := db.Exec(c.Request.Context(), `UPDATE vouchers SET is_active = false WHERE id = $1`, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})
}
