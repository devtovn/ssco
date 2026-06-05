package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterPublic(rg *gin.RouterGroup, db *pgxpool.Pool) {
	rg.GET("/config", func(c *gin.Context) {
		row := db.QueryRow(c.Request.Context(),
			`SELECT config_data FROM website_config ORDER BY updated_at DESC LIMIT 1`)
		var configData interface{}
		if err := row.Scan(&configData); err != nil {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{}})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": configData})
	})
}
