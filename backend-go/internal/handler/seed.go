package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssco/backend/internal/middleware"
	"github.com/ssco/backend/internal/model"
	"github.com/ssco/backend/internal/service"
)

type SeedHandler struct {
	collection  *service.DataCollectionService
	platformAPI *service.PlatformAPIService
}

func RegisterSeed(rg *gin.RouterGroup, jwtSecret string,
	collection *service.DataCollectionService,
	platformAPI *service.PlatformAPIService) {

	h := &SeedHandler{collection: collection, platformAPI: platformAPI}
	auth := middleware.AuthJWT(jwtSecret)
	admin := middleware.RequireRole("Administrator")

	rg.POST("/preview", auth, admin, h.Preview)
	rg.POST("/save", auth, admin, h.Save)
	rg.POST("/:id/refresh", auth, admin, h.Refresh)
}

func (h *SeedHandler) Preview(c *gin.Context) {
	var body struct {
		Keyword string `json:"keyword"`
		URL     string `json:"url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	keyword := body.Keyword
	if keyword == "" {
		keyword = body.URL
	}

	results := h.platformAPI.SearchAll(c.Request.Context(), keyword, 5)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": results})
}

func (h *SeedHandler) Save(c *gin.Context) {
	var body struct {
		Primary    model.NormalizedProduct   `json:"primary"`
		Entries    []model.NormalizedProduct `json:"entries"`
		CategoryID string                    `json:"categoryId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	keywords := []string{body.Primary.Name}
	collected, stored, errs := h.collection.CollectFromAPIs(c.Request.Context(), keywords)
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"collected": collected,
		"stored":    stored,
		"errors":    errs,
	})
}

func (h *SeedHandler) Refresh(c *gin.Context) {
	id := c.Param("id")
	updated, errs := h.collection.RefreshProductPrices(c.Request.Context(), id)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"updated": updated,
		"errors":  errs,
	})
}
