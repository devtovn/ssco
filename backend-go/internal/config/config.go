package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port    string
	APIBase string
	Env     string

	// Database
	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string
	DBPoolMin  int
	DBPoolMax  int

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string

	// JWT
	JWTSecret        string
	JWTRefreshSecret string
	JWTExpiresIn     string
	JWTRefreshExpiry string

	// CORS
	CORSOrigin string

	// External APIs
	OpenAIKey         string
	ClaudeKey         string
	TikiAPIKey        string
	LazadaAPIKey      string
	LazadaAPISecret   string
	TiktokShopAPIKey  string

	// Rate limiting
	RateLimitWindowMs      int
	RateLimitMaxReq        int
	AuthRateLimitWindowMs  int
	AuthRateLimitMaxReq    int
	SearchRateLimitWindowMs int
	SearchRateLimitMaxReq  int

	// Scheduler
	CollectionCron     string
	CollectionKeywords string
	SchedulerEnabled   bool
}

func Load() *Config {
	_ = godotenv.Load()

	return &Config{
		Port:    getEnv("PORT", "4000"),
		APIBase: getEnv("API_BASE_URL", "http://localhost:4000"),
		Env:     getEnv("NODE_ENV", "development"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBName:     getEnv("DB_NAME", "price_comparison"),
		DBUser:     getEnv("DB_USER", "pricecompare"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBPoolMin:  getEnvInt("DATABASE_POOL_MIN", 2),
		DBPoolMax:  getEnvInt("DATABASE_POOL_MAX", 50),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		JWTSecret:        getEnv("JWT_SECRET", "dev_jwt_secret_change_in_production"),
		JWTRefreshSecret: getEnv("JWT_REFRESH_SECRET", "dev_jwt_refresh_secret_change_in_production"),
		JWTExpiresIn:     getEnv("JWT_EXPIRES_IN", "24h"),
		JWTRefreshExpiry: getEnv("JWT_REFRESH_EXPIRES_IN", "168h"),

		CORSOrigin: getEnv("FRONTEND_URL", "http://localhost:3000"),

		OpenAIKey:        getEnv("OPENAI_API_KEY", ""),
		ClaudeKey:        getEnv("CLAUDE_API_KEY", ""),
		TikiAPIKey:       getEnv("TIKI_API_KEY", ""),
		LazadaAPIKey:     getEnv("LAZADA_API_KEY", ""),
		LazadaAPISecret:  getEnv("LAZADA_API_SECRET", ""),
		TiktokShopAPIKey: getEnv("TIKTOK_SHOP_API_KEY", ""),

		RateLimitWindowMs:       getEnvInt("RATE_LIMIT_WINDOW_MS", 60000),
		RateLimitMaxReq:         getEnvInt("RATE_LIMIT_MAX_REQUESTS", 100),
		AuthRateLimitWindowMs:   getEnvInt("AUTH_RATE_LIMIT_WINDOW_MS", 60000),
		AuthRateLimitMaxReq:     getEnvInt("AUTH_RATE_LIMIT_MAX_REQUESTS", 20),
		SearchRateLimitWindowMs: getEnvInt("SEARCH_RATE_LIMIT_WINDOW_MS", 60000),
		SearchRateLimitMaxReq:   getEnvInt("SEARCH_RATE_LIMIT_MAX_REQUESTS", 60),

		CollectionCron:     getEnv("COLLECTION_SCHEDULE_CRON", "0 */6 * * *"),
		CollectionKeywords: getEnv("COLLECTION_DEFAULT_KEYWORDS", "điện thoại,laptop,tivi"),
		SchedulerEnabled:   getEnv("DATA_COLLECTION_SCHEDULER_ENABLED", "true") != "false",
	}
}

func (c *Config) DBUrl() string {
	return fmt.Sprintf("postgresql://%s:%s@%s:%s/%s",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}

func (c *Config) RedisAddr() string {
	return fmt.Sprintf("%s:%s", c.RedisHost, c.RedisPort)
}

func (c *Config) IsProd() bool {
	return c.Env == "production"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		slog.Warn("invalid env int", "key", key, "value", v)
		return fallback
	}
	return n
}
