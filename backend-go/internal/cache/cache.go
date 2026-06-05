package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// TTL constants — mirrors CacheTTL in Node.js
const (
	TTLCategoryTree     = 1 * time.Hour
	TTLCategoryProducts = 10 * time.Minute
	TTLCategoryMetrics  = 30 * time.Minute
	TTLSearchResults    = 5 * time.Minute
	TTLSearchSuggestions = 10 * time.Minute
	TTLPopularKeywords  = 30 * time.Minute
	TTLProductPrices    = 1 * time.Hour
	TTLPriceHistory     = 2 * time.Hour
	TTLBestDeals        = 30 * time.Minute
	TTLAffiliateConfigs = 1 * time.Hour
	TTLAffiliateCampaigns = 30 * time.Minute
	TTLAdZones          = 10 * time.Minute
	TTLAdPerformance    = 5 * time.Minute
	TTLRefreshToken     = 7 * 24 * time.Hour
	TTLUserSession      = 24 * time.Hour
)

// Key builders — mirrors CacheKeys in Node.js
func KeyCategoryTree() string                    { return "category:tree" }
func KeyCategoryProducts(id int) string          { return fmt.Sprintf("category:%d:products", id) }
func KeyCategoryMetrics(id int) string           { return fmt.Sprintf("category:%d:metrics", id) }
func KeySearchResults(hash string) string        { return fmt.Sprintf("search:results:%s", hash) }
func KeySearchSuggestions(q string) string       { return fmt.Sprintf("search:suggestions:%s", q) }
func KeyPopularKeywords() string                 { return "search:popular_keywords" }
func KeyProductPrices(id string) string          { return fmt.Sprintf("product:%s:prices", id) }
func KeyPriceHistory(id string) string           { return fmt.Sprintf("product:%s:price_history", id) }
func KeyBestDeals(categoryID *int) string {
	if categoryID != nil {
		return fmt.Sprintf("deals:category:%d", *categoryID)
	}
	return "deals:all"
}
func KeyAffiliateConfigs() string                          { return "affiliate:configs" }
func KeyAffiliatePlatform(id string) string                { return fmt.Sprintf("affiliate:config:platform:%s", id) }
func KeyAffiliateCampaigns(id string) string               { return fmt.Sprintf("affiliate:campaigns:%s", id) }
func KeyAdZones() string                                   { return "ads:zones:all" }
func KeyAdZone(id string) string                           { return fmt.Sprintf("ads:zone:%s", id) }
func KeyAdActive(zoneID string) string                     { return fmt.Sprintf("ads:active:%s", zoneID) }
func KeyRateLimit(ip string) string                        { return fmt.Sprintf("rate:%s", ip) }
func KeyRefreshToken(userID string) string                 { return fmt.Sprintf("auth:refresh_token:%s", userID) }
func KeyUserSession(sessionID string) string               { return fmt.Sprintf("auth:session:%s", sessionID) }

// Service provides get/set/delete operations over Redis.
type Service struct {
	rdb *redis.Client
}

func New(rdb *redis.Client) *Service {
	return &Service{rdb: rdb}
}

func (s *Service) Get(ctx context.Context, key string, dest any) (bool, error) {
	val, err := s.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, json.Unmarshal([]byte(val), dest)
}

func (s *Service) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	b, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return s.rdb.SetEx(ctx, key, string(b), ttl).Err()
}

func (s *Service) Delete(ctx context.Context, key string) error {
	return s.rdb.Del(ctx, key).Err()
}

// DeletePattern uses SCAN to avoid blocking Redis (replaces KEYS).
func (s *Service) DeletePattern(ctx context.Context, pattern string) (int, error) {
	var deleted int
	var cursor uint64

	for {
		keys, next, err := s.rdb.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return deleted, err
		}
		if len(keys) > 0 {
			if n, err := s.rdb.Del(ctx, keys...).Result(); err != nil {
				slog.Warn("cache delete batch error", "pattern", pattern, "err", err)
			} else {
				deleted += int(n)
			}
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return deleted, nil
}

func (s *Service) Exists(ctx context.Context, key string) (bool, error) {
	n, err := s.rdb.Exists(ctx, key).Result()
	return n == 1, err
}

func (s *Service) TTL(ctx context.Context, key string) (time.Duration, error) {
	return s.rdb.TTL(ctx, key).Result()
}

func (s *Service) Incr(ctx context.Context, key string) (int64, error) {
	return s.rdb.Incr(ctx, key).Result()
}

func (s *Service) Expire(ctx context.Context, key string, ttl time.Duration) error {
	return s.rdb.Expire(ctx, key, ttl).Err()
}

func (s *Service) ClearAll(ctx context.Context) error {
	return s.rdb.FlushDB(ctx).Err()
}
