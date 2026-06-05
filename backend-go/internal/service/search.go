package service

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/ssco/backend/internal/cache"
	"github.com/ssco/backend/internal/model"
	"github.com/ssco/backend/internal/repository"
)

type SearchService struct {
	repo *repository.SearchRepo
	cs   *cache.Service
}

func NewSearchService(repo *repository.SearchRepo, cs *cache.Service) *SearchService {
	return &SearchService{repo: repo, cs: cs}
}

func (s *SearchService) Search(ctx context.Context, q model.SearchQuery) (*model.SearchResponse, error) {
	start := time.Now()
	key := cache.KeySearchResults(hashQuery(q))

	var cached model.SearchResponse
	if hit, _ := s.cs.Get(ctx, key, &cached); hit {
		cached.ResponseMs = time.Since(start).Milliseconds()
		return &cached, nil
	}

	resp, err := s.repo.Search(ctx, q)
	if err != nil {
		return nil, err
	}
	resp.ResponseMs = time.Since(start).Milliseconds()

	_ = s.cs.Set(ctx, key, resp, cache.TTLSearchResults)

	// Track asynchronously
	go func() {
		_ = s.repo.TrackSearch(context.Background(), q.Keyword, resp.Total, resp.ResponseMs)
	}()

	return resp, nil
}

func (s *SearchService) GetSuggestions(ctx context.Context, q string, limit int) ([]model.SearchSuggestion, error) {
	if len(strings.TrimSpace(q)) < 2 {
		return nil, nil
	}
	key := cache.KeySearchSuggestions(strings.ToLower(strings.TrimSpace(q)))

	var cached []model.SearchSuggestion
	if hit, _ := s.cs.Get(ctx, key, &cached); hit {
		return cached, nil
	}

	suggestions, err := s.repo.GetSuggestions(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	_ = s.cs.Set(ctx, key, suggestions, cache.TTLSearchSuggestions)
	return suggestions, nil
}

func (s *SearchService) GetPopularKeywords(ctx context.Context, limit int) ([]model.PopularKeyword, error) {
	key := fmt.Sprintf("%s:%d", cache.KeyPopularKeywords(), limit)

	var cached []model.PopularKeyword
	if hit, _ := s.cs.Get(ctx, key, &cached); hit {
		return cached, nil
	}

	keywords, err := s.repo.GetPopularKeywords(ctx, limit)
	if err != nil {
		return nil, err
	}
	_ = s.cs.Set(ctx, key, keywords, cache.TTLPopularKeywords)
	return keywords, nil
}

func hashQuery(q model.SearchQuery) string {
	b, _ := json.Marshal(q)
	return fmt.Sprintf("%x", md5.Sum(b))
}
