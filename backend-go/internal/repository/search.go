package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/model"
)

type SearchRepo struct {
	db *pgxpool.Pool
}

func NewSearchRepo(db *pgxpool.Pool) *SearchRepo {
	return &SearchRepo{db: db}
}

func (r *SearchRepo) Search(ctx context.Context, q model.SearchQuery) (*model.SearchResponse, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.Limit < 1 || q.Limit > 100 {
		q.Limit = 20
	}
	offset := (q.Page - 1) * q.Limit

	args := []any{}
	conditions := []string{"p.is_active = true"}
	i := 1

	if q.Keyword != "" {
		conditions = append(conditions,
			fmt.Sprintf("(p.search_vector @@ plainto_tsquery('vietnamese', $%d) OR p.name ILIKE $%d)", i, i+1))
		args = append(args, q.Keyword, "%"+q.Keyword+"%")
		i += 2
	}
	if q.CategoryID != nil {
		conditions = append(conditions, fmt.Sprintf("EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = $%d)", i))
		args = append(args, *q.CategoryID)
		i++
	}
	if q.Brand != nil {
		conditions = append(conditions, fmt.Sprintf("p.brand ILIKE $%d", i))
		args = append(args, "%"+*q.Brand+"%")
		i++
	}
	if q.MinPrice != nil {
		conditions = append(conditions, fmt.Sprintf("cp.price >= $%d", i))
		args = append(args, *q.MinPrice)
		i++
	}
	if q.MaxPrice != nil {
		conditions = append(conditions, fmt.Sprintf("cp.price <= $%d", i))
		args = append(args, *q.MaxPrice)
		i++
	}

	where := strings.Join(conditions, " AND ")

	orderBy := "cp.price ASC"
	switch q.SortBy {
	case "price_desc":
		orderBy = "cp.price DESC"
	case "name_asc":
		orderBy = "p.name ASC"
	case "newest":
		orderBy = "p.created_at DESC"
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT p.id)
		FROM products p
		LEFT JOIN cheapest_prices cp ON cp.product_id = p.id
		WHERE %s`, where)

	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	dataQuery := fmt.Sprintf(`
		SELECT p.id, p.name, p.slug, p.brand, p.images, p.is_active, p.created_at, p.updated_at,
		       COALESCE(cp.price, 0) AS lowest_price,
		       (SELECT COUNT(*) FROM price_entries pe WHERE pe.product_id = p.id AND pe.is_available = true) AS source_count
		FROM products p
		LEFT JOIN cheapest_prices cp ON cp.product_id = p.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d`, where, orderBy, i, i+1)

	args = append(args, q.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []model.SearchResult
	for rows.Next() {
		var sr model.SearchResult
		var images []string
		if err := rows.Scan(
			&sr.Product.ID, &sr.Product.Name, &sr.Product.Slug,
			&sr.Product.Brand, &images,
			&sr.Product.IsActive, &sr.Product.CreatedAt, &sr.Product.UpdatedAt,
			&sr.LowestPrice, &sr.SourceCount,
		); err != nil {
			return nil, err
		}
		sr.Product.Images = images
		results = append(results, sr)
	}

	totalPages := (total + q.Limit - 1) / q.Limit
	return &model.SearchResponse{
		Results:    results,
		Total:      total,
		Page:       q.Page,
		Limit:      q.Limit,
		TotalPages: totalPages,
	}, nil
}

func (r *SearchRepo) GetSuggestions(ctx context.Context, query string, limit int) ([]model.SearchSuggestion, error) {
	rows, err := r.db.Query(ctx,
		`SELECT keyword, search_count FROM search_queries
		 WHERE keyword ILIKE $1 AND search_count > 0
		 ORDER BY search_count DESC LIMIT $2`,
		"%"+query+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var suggestions []model.SearchSuggestion
	for rows.Next() {
		var s model.SearchSuggestion
		if err := rows.Scan(&s.Keyword, &s.Count); err != nil {
			return nil, err
		}
		suggestions = append(suggestions, s)
	}
	return suggestions, nil
}

func (r *SearchRepo) GetPopularKeywords(ctx context.Context, limit int) ([]model.PopularKeyword, error) {
	rows, err := r.db.Query(ctx,
		`SELECT keyword, search_count FROM search_queries
		 WHERE search_count > 0 ORDER BY search_count DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keywords := []model.PopularKeyword{}
	for rows.Next() {
		var k model.PopularKeyword
		if err := rows.Scan(&k.Keyword, &k.Count); err != nil {
			return nil, err
		}
		keywords = append(keywords, k)
	}
	return keywords, nil
}

func (r *SearchRepo) TrackSearch(ctx context.Context, keyword string, resultsCount int, responseMs int64) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO search_queries (keyword, search_count, last_searched_at)
		 VALUES ($1, 1, $2)
		 ON CONFLICT (keyword) DO UPDATE SET
		   search_count = search_queries.search_count + 1,
		   last_searched_at = $2`,
		keyword, time.Now())
	return err
}
