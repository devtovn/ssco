package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ssco/backend/internal/cache"
)

// RateLimiter returns a Gin middleware backed by Redis INCR+EXPIRE.
// Falls back gracefully (fail-open) if Redis is unavailable.
func RateLimiter(cs *cache.Service, windowMs, maxRequests int) gin.HandlerFunc {
	window := time.Duration(windowMs) * time.Millisecond

	return func(c *gin.Context) {
		key := cache.KeyRateLimit(c.ClientIP())
		ctx := c.Request.Context()

		count, err := cs.Incr(ctx, key)
		if err != nil {
			// Redis unavailable — fail open
			c.Next()
			return
		}

		if count == 1 {
			_ = cs.Expire(ctx, key, window)
		}

		ttl, _ := cs.TTL(ctx, key)
		resetAt := time.Now().Add(ttl).Unix()
		remaining := maxRequests - int(count)
		if remaining < 0 {
			remaining = 0
		}

		c.Header("X-RateLimit-Limit", strconv.Itoa(maxRequests))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetAt, 10))

		if int(count) > maxRequests {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMIT_EXCEEDED",
					"message": "Too many requests. Please try again later.",
				},
			})
			return
		}

		c.Next()
	}
}
