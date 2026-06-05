package service

import (
	"context"
	"time"

	"github.com/ssco/backend/internal/cache"
	"github.com/ssco/backend/internal/model"
	"github.com/ssco/backend/internal/repository"
)

type CategoryService struct {
	repo *repository.CategoryRepo
	cs   *cache.Service
}

func NewCategoryService(repo *repository.CategoryRepo, cs *cache.Service) *CategoryService {
	return &CategoryService{repo: repo, cs: cs}
}

func (s *CategoryService) GetTree(ctx context.Context, onlyActive bool) ([]model.Category, error) {
	key := cache.KeyCategoryTree()
	var cached []model.Category
	if hit, _ := s.cs.Get(ctx, key, &cached); hit {
		return cached, nil
	}
	tree, err := s.repo.GetTree(ctx, onlyActive)
	if err != nil {
		return nil, err
	}
	_ = s.cs.Set(ctx, key, tree, cache.TTLCategoryTree)
	return tree, nil
}

func (s *CategoryService) GetBySlug(ctx context.Context, slug string) (*model.Category, error) {
	return s.repo.GetBySlug(ctx, slug)
}

func (s *CategoryService) GetByID(ctx context.Context, id string) (*model.Category, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *CategoryService) Create(ctx context.Context, c *model.Category) (*model.Category, error) {
	result, err := s.repo.Create(ctx, c)
	if err != nil {
		return nil, err
	}
	s.invalidate(ctx)
	return result, nil
}

func (s *CategoryService) Update(ctx context.Context, id string, c *model.Category) (*model.Category, error) {
	result, err := s.repo.Update(ctx, id, c)
	if err != nil {
		return nil, err
	}
	s.invalidate(ctx)
	return result, nil
}

func (s *CategoryService) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.invalidate(ctx)
	return nil
}

func (s *CategoryService) invalidate(ctx context.Context) {
	_ = s.cs.Delete(ctx, cache.KeyCategoryTree())
	_, _ = s.cs.DeletePattern(ctx, "category:*")
}

// WarmCache pre-loads the category tree.
func (s *CategoryService) WarmCache(ctx context.Context) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	_, _ = s.GetTree(ctx, true)
}
