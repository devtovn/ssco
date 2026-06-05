package config

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(cfg *Config) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr(),
		Password: cfg.RedisPassword,
		DB:       0,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	slog.Info("redis connected", "addr", cfg.RedisAddr())
	return rdb, nil
}
