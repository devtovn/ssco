package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ssco/backend/internal/service"
)

type PriceHandler struct {
	svc *service.PriceService
}

func RegisterPrices(rg *gin.RouterGroup, svc *service.PriceService) {
	h := &PriceHandler{svc: svc}
	rg.GET("/:id/prices", h.GetPrices)
	rg.GET("/:id/price-history", h.GetHistory)
}

func RegisterDeals(rg *gin.RouterGroup, svc *service.PriceService) {
	h := &PriceHandler{svc: svc}
	rg.GET("/deals", h.GetDeals)
}

func (h *PriceHandler) GetPrices(c *gin.Context) {
	id := c.Param("id")
	result, err := h.svc.GetProductPrices(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error(), "code": "NOT_FOUND"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PriceHandler) GetHistory(c *gin.Context) {
	id := c.Param("id")
	source := c.DefaultQuery("source", "all")
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))

	result, err := h.svc.GetPriceHistory(c.Request.Context(), id, source, days)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error(), "code": "NOT_FOUND"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PriceHandler) GetDeals(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	minDiscount, _ := strconv.ParseFloat(c.DefaultQuery("minDiscount", "10"), 64)

	var categoryID *int
	if v := c.Query("categoryId"); v != "" {
		if id, err := strconv.Atoi(v); err == nil {
			categoryID = &id
		}
	}

	deals, err := h.svc.GetBestDeals(c.Request.Context(), categoryID, limit, minDiscount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": deals})
}
