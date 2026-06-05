package middleware

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AppError struct {
	StatusCode int    `json:"-"`
	Code       string `json:"code"`
	Message    string `json:"message"`
}

func (e *AppError) Error() string { return e.Message }

func NewNotFound(msg string) *AppError {
	if msg == "" {
		msg = "Resource not found"
	}
	return &AppError{StatusCode: http.StatusNotFound, Code: "NOT_FOUND", Message: msg}
}

func NewUnauthorized(msg string) *AppError {
	if msg == "" {
		msg = "Unauthorized"
	}
	return &AppError{StatusCode: http.StatusUnauthorized, Code: "UNAUTHORIZED", Message: msg}
}

func NewForbidden(msg string) *AppError {
	if msg == "" {
		msg = "Forbidden"
	}
	return &AppError{StatusCode: http.StatusForbidden, Code: "FORBIDDEN", Message: msg}
}

func NewBadRequest(msg string) *AppError {
	return &AppError{StatusCode: http.StatusBadRequest, Code: "BAD_REQUEST", Message: msg}
}

func NewConflict(msg string) *AppError {
	return &AppError{StatusCode: http.StatusConflict, Code: "CONFLICT", Message: msg}
}

func NewInternal(msg string) *AppError {
	if msg == "" {
		msg = "Internal server error"
	}
	return &AppError{StatusCode: http.StatusInternalServerError, Code: "INTERNAL_ERROR", Message: msg}
}

// ErrorHandler is a Gin middleware that recovers panics and formats errors.
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 {
			return
		}

		err := c.Errors.Last().Err

		var appErr *AppError
		if errors.As(err, &appErr) {
			c.JSON(appErr.StatusCode, gin.H{
				"status":  "error",
				"code":    appErr.Code,
				"message": appErr.Message,
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"code":    "INTERNAL_ERROR",
			"message": "Internal server error",
		})
	}
}

func NotFound() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"code":    "NOT_FOUND",
			"message": "Route not found",
		})
	}
}
