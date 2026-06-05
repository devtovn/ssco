package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssco/backend/internal/model"
	"github.com/ssco/backend/internal/service"
)

type SearchHandler struct {
	svc *service.SearchService
}

func RegisterSearch(rg *gin.RouterGroup, searchLimiter gin.HandlerFunc, svc *service.SearchService) {
	h := &SearchHandler{svc: svc}
	rg.Use(searchLimiter)
	rg.GET("", h.Search)
	rg.GET("/suggestions", h.Suggestions)
	rg.GET("/popular", h.Popular)
}

func (h *SearchHandler) Search(c *gin.Context) {
	q := model.SearchQuery{
		Keyword: c.Query("keyword"),
		SortBy:  c.Query("sortBy"),
	}
	if v := c.Query("categoryId"); v != "" {
		if id, err := strconv.Atoi(v); err == nil {
			q.CategoryID = &id
		}
	}
	if v := c.Query("minPrice"); v != "" {
		if p, err := strconv.ParseFloat(v, 64); err == nil {
			q.MinPrice = &p
		}
	}
	if v := c.Query("maxPrice"); v != "" {
		if p, err := strconv.ParseFloat(v, 64); err == nil {
			q.MaxPrice = &p
		}
	}
	if v := c.Query("brand"); v != "" {
		q.Brand = &v
	}
	q.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	q.Limit, _ = strconv.Atoi(c.DefaultQuery("limit", "20"))

	resp, err := h.svc.Search(c.Request.Context(), q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": resp})
}

func (h *SearchHandler) Suggestions(c *gin.Context) {
	q := c.Query("q")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	suggestions, err := h.svc.GetSuggestions(c.Request.Context(), q, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": suggestions})
}

func (h *SearchHandler) Popular(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	keywords, err := h.svc.GetPopularKeywords(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": keywords})
}
