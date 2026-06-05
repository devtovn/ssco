package service

import (
	"context"
	"fmt"

	"github.com/ssco/backend/internal/cache"
	"github.com/ssco/backend/internal/model"
	"github.com/ssco/backend/internal/repository"
)

type PriceService struct {
	repo *repository.PriceRepo
	cs   *cache.Service
}

func NewPriceService(repo *repository.PriceRepo, cs *cache.Service) *PriceService {
	return &PriceService{repo: repo, cs: cs}
}

func (s *PriceService) GetProductPrices(ctx context.Context, productID string) (*model.PriceComparison, error) {
	key := cache.KeyProductPrices(productID)
	var cached model.PriceComparison
	if hit, _ := s.cs.Get(ctx, key, &cached); hit {
		return &cached, nil
	}
	result, err := s.repo.GetProductPrices(ctx, productID)
	if err != nil {
		return nil, err
	}
	_ = s.cs.Set(ctx, key, result, cache.TTLProductPrices)
	return result, nil
}

func (s *PriceService) GetPriceHistory(ctx context.Context, productID, source string, days int) (*model.PriceHistory, error) {
	key := fmt.Sprintf("%s:%s:%d", cache.KeyPriceHistory(productID), source, days)
	var cached model.PriceHistory
	if hit, _ := s.cs.Get(ctx, key, &cached); hit {
		return &cached, nil
	}
	result, err := s.repo.GetPriceHistory(ctx, productID, source, days)
	if err != nil {
		return nil, err
	}
	_ = s.cs.Set(ctx, key, result, cache.TTLPriceHistory)
	return result, nil
}

func (s *PriceService) GetBestDeals(ctx context.Context, categoryID *int, limit int, minDiscountPct float64) ([]model.Deal, error) {
	key := fmt.Sprintf("%s:%d:%.0f", cache.KeyBestDeals(categoryID), limit, minDiscountPct)
	var cached []model.Deal
	if hit, _ := s.cs.Get(ctx, key, &cached); hit {
		return cached, nil
	}
	deals, err := s.repo.GetBestDeals(ctx, categoryID, limit, minDiscountPct)
	if err != nil {
		return nil, err
	}
	_ = s.cs.Set(ctx, key, deals, cache.TTLBestDeals)
	return deals, nil
}

func (s *PriceService) InvalidateProductCache(ctx context.Context, productID string) {
	_ = s.cs.Delete(ctx, cache.KeyProductPrices(productID))
	_, _ = s.cs.DeletePattern(ctx, fmt.Sprintf("%s:*", cache.KeyPriceHistory(productID)))
	_, _ = s.cs.DeletePattern(ctx, "deals:*")
}
