package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/middleware"
)

func RegisterContent(rg *gin.RouterGroup, jwtSecret string, db *pgxpool.Pool) {
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	rg.GET("/articles", func(c *gin.Context) {
		rows, err := db.Query(c.Request.Context(),
			`SELECT id, title, slug, excerpt, cover_image, is_published, published_at, created_at
			 FROM articles WHERE is_published = true ORDER BY published_at DESC LIMIT 20`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var articles []gin.H
		for rows.Next() {
			var id, title, slug string
			var excerpt, coverImage *string
			var isPublished bool
			var publishedAt, createdAt interface{}
			_ = rows.Scan(&id, &title, &slug, &excerpt, &coverImage, &isPublished, &publishedAt, &createdAt)
			articles = append(articles, gin.H{
				"id": id, "title": title, "slug": slug, "excerpt": excerpt,
				"coverImage": coverImage, "publishedAt": publishedAt,
			})
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": articles})
	})

	rg.GET("/articles/:slug", func(c *gin.Context) {
		row := db.QueryRow(c.Request.Context(),
			`SELECT id, title, slug, content, excerpt, cover_image, is_published, published_at
			 FROM articles WHERE slug = $1 AND is_published = true`, c.Param("slug"))
		var id, title, slug, content string
		var excerpt, coverImage *string
		var isPublished bool
		var publishedAt interface{}
		if err := row.Scan(&id, &title, &slug, &content, &excerpt, &coverImage, &isPublished, &publishedAt); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "article not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
			"id": id, "title": title, "slug": slug, "content": content,
			"excerpt": excerpt, "coverImage": coverImage, "publishedAt": publishedAt,
		}})
	})

	rg.POST("/articles", auth, admin, func(c *gin.Context) {
		// TODO: create article
		c.JSON(http.StatusCreated, gin.H{"success": true})
	})
	rg.PUT("/articles/:id", auth, admin, func(c *gin.Context) {
		// TODO: update article
		c.JSON(http.StatusOK, gin.H{"success": true})
	})
	rg.DELETE("/articles/:id", auth, admin, func(c *gin.Context) {
		_, err := db.Exec(c.Request.Context(), `DELETE FROM articles WHERE id = $1`, c.Param("id"))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})
}
