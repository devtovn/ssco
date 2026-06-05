package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const ClaimsKey contextKey = "claims"

type JWTClaims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func AuthJWT(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "No token provided", "code": "NO_TOKEN",
			})
			return
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims := &JWTClaims{}

		_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, NewUnauthorized("unexpected signing method")
			}
			return []byte(secret), nil
		})
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": err.Error(), "code": "INVALID_TOKEN",
			})
			return
		}

		c.Set(string(ClaimsKey), claims)
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *gin.Context) {
		claims, ok := c.Get(string(ClaimsKey))
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized", "code": "UNAUTHORIZED"})
			return
		}
		jc, ok := claims.(*JWTClaims)
		if !ok || !allowed[jc.Role] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden", "code": "FORBIDDEN"})
			return
		}
		c.Next()
	}
}

// GetClaims extracts JWT claims from Gin context.
func GetClaims(c *gin.Context) *JWTClaims {
	v, _ := c.Get(string(ClaimsKey))
	claims, _ := v.(*JWTClaims)
	return claims
}
