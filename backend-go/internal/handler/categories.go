package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssco/backend/internal/middleware"
	"github.com/ssco/backend/internal/model"
	"github.com/ssco/backend/internal/service"
)

type CategoryHandler struct {
	svc *service.CategoryService
}

func RegisterCategories(rg *gin.RouterGroup, svc *service.CategoryService, jwtSecret string) {
	h := &CategoryHandler{svc: svc}
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	rg.GET("/tree", h.GetTree)
	rg.GET("/:slug", h.GetBySlug)
	rg.POST("", auth, admin, h.Create)
	rg.PUT("/:id", auth, admin, h.Update)
	rg.DELETE("/:id", auth, admin, h.Delete)
}

func (h *CategoryHandler) GetTree(c *gin.Context) {
	onlyActive := c.Query("includeInactive") != "true"
	tree, err := h.svc.GetTree(c.Request.Context(), onlyActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": tree})
}

func (h *CategoryHandler) GetBySlug(c *gin.Context) {
	cat, err := h.svc.GetBySlug(c.Request.Context(), c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error(), "code": "NOT_FOUND"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": cat})
}

func (h *CategoryHandler) Create(c *gin.Context) {
	var body model.Category
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.svc.Create(c.Request.Context(), &body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": result})
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var body model.Category
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.svc.Update(c.Request.Context(), id, &body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), c.Param("id")); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Category deleted"})
}
