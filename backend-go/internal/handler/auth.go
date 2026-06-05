package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ssco/backend/internal/middleware"
	"github.com/ssco/backend/internal/service"
)

type AuthHandler struct {
	svc *service.AuthService
}

func RegisterAuth(rg *gin.RouterGroup, authLimiter gin.HandlerFunc, svc *service.AuthService, jwtSecret string) {
	h := &AuthHandler{svc: svc}

	rg.POST("/login", authLimiter, h.Login)
	rg.POST("/logout", h.Logout)
	rg.POST("/refresh", h.Refresh)
	rg.GET("/me", middleware.AuthJWT(jwtSecret), h.Me)
	rg.PUT("/change-password", middleware.AuthJWT(jwtSecret), h.ChangePassword)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "VALIDATION_ERROR"})
		return
	}

	result, err := h.svc.Login(c.Request.Context(), body.Email, body.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error(), "code": "INVALID_CREDENTIALS"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": result.User,
		"tokens": gin.H{
			"accessToken":  result.AccessToken,
			"refreshToken": result.RefreshToken,
			"expiresIn":    result.ExpiresIn,
		},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	_ = c.ShouldBindJSON(&body)
	if body.RefreshToken != "" {
		h.svc.Logout(c.Request.Context(), body.RefreshToken)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logged out successfully"})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "VALIDATION_ERROR"})
		return
	}

	result, err := h.svc.Refresh(c.Request.Context(), body.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error(), "code": "INVALID_TOKEN"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tokens": gin.H{
			"accessToken":  result.AccessToken,
			"refreshToken": result.RefreshToken,
			"expiresIn":    result.ExpiresIn,
		},
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := h.svc.GetUserByID(c.Request.Context(), claims.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"user": user}})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	claims := middleware.GetClaims(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var body struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "VALIDATION_ERROR"})
		return
	}

	if err := h.svc.ChangePassword(c.Request.Context(), claims.UserID, body.CurrentPassword, body.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "PASSWORD_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password changed successfully"})
}
