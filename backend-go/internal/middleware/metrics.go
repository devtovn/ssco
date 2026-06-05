package middleware

import (
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

type MetricsSnapshot struct {
	TotalRequests      int64              `json:"totalRequests"`
	TotalErrors        int64              `json:"totalErrors"`
	AvgResponseTimeMs  float64            `json:"averageResponseTimeMs"`
	RequestsByMethod   map[string]int64   `json:"requestsByMethod"`
	RequestsByStatus   map[string]int64   `json:"requestsByStatus"`
	UptimeSeconds      float64            `json:"uptimeSeconds"`
}

var (
	startedAt          = time.Now()
	totalRequests      int64
	totalErrors        int64
	totalResponseTime  int64 // nanoseconds
	methodMu           sync.RWMutex
	requestsByMethod   = map[string]int64{}
	statusMu           sync.RWMutex
	requestsByStatus   = map[string]int64{}
)

func Metrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()

		atomic.AddInt64(&totalRequests, 1)
		atomic.AddInt64(&totalResponseTime, duration.Nanoseconds())

		if status >= 500 {
			atomic.AddInt64(&totalErrors, 1)
		}

		methodMu.Lock()
		requestsByMethod[c.Request.Method]++
		methodMu.Unlock()

		statusKey := string(rune('0'+status/100)) + "xx"
		statusMu.Lock()
		requestsByStatus[statusKey]++
		statusMu.Unlock()
	}
}

func GetMetrics() MetricsSnapshot {
	total := atomic.LoadInt64(&totalRequests)
	var avg float64
	if total > 0 {
		avg = float64(atomic.LoadInt64(&totalResponseTime)) / float64(total) / 1e6
	}

	methodMu.RLock()
	methods := make(map[string]int64, len(requestsByMethod))
	for k, v := range requestsByMethod {
		methods[k] = v
	}
	methodMu.RUnlock()

	statusMu.RLock()
	statuses := make(map[string]int64, len(requestsByStatus))
	for k, v := range requestsByStatus {
		statuses[k] = v
	}
	statusMu.RUnlock()

	return MetricsSnapshot{
		TotalRequests:     total,
		TotalErrors:       atomic.LoadInt64(&totalErrors),
		AvgResponseTimeMs: avg,
		RequestsByMethod:  methods,
		RequestsByStatus:  statuses,
		UptimeSeconds:     time.Since(startedAt).Seconds(),
	}
}
