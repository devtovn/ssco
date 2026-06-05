package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/model"
)

type PriceRepo struct {
	db *pgxpool.Pool
}

func NewPriceRepo(db *pgxpool.Pool) *PriceRepo {
	return &PriceRepo{db: db}
}

func (r *PriceRepo) GetProductPrices(ctx context.Context, productID string) (*model.PriceComparison, error) {
	row := r.db.QueryRow(ctx, `SELECT id, name, slug FROM products WHERE id = $1 AND is_active = true`, productID)
	var p model.Product
	if err := row.Scan(&p.ID, &p.Name, &p.Slug); err != nil {
		return nil, fmt.Errorf("product not found")
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, product_id, source_name, source_url, affiliate_url, price, currency, is_available, scraped_at, created_at
		 FROM price_entries WHERE product_id = $1 AND is_available = true
		 ORDER BY price ASC`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []model.PriceEntry
	var lowest, highest float64
	first := true
	for rows.Next() {
		var e model.PriceEntry
		if err := rows.Scan(&e.ID, &e.ProductID, &e.SourceName, &e.SourceURL, &e.AffiliateURL,
			&e.Price, &e.Currency, &e.IsAvailable, &e.ScrapedAt, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
		if first || e.Price < lowest {
			lowest = e.Price
		}
		if first || e.Price > highest {
			highest = e.Price
		}
		first = false
	}

	return &model.PriceComparison{
		ProductID:    p.ID,
		ProductName:  p.Name,
		ProductSlug:  p.Slug,
		Prices:       entries,
		LowestPrice:  lowest,
		HighestPrice: highest,
	}, nil
}

func (r *PriceRepo) GetPriceHistory(ctx context.Context, productID, source string, days int) (*model.PriceHistory, error) {
	q := `SELECT price, scraped_at FROM price_entries
	      WHERE product_id = $1 AND scraped_at > NOW() - ($2 || ' days')::interval`
	args := []any{productID, days}

	if source != "" && source != "all" {
		q += " AND source_name = $3 ORDER BY scraped_at ASC"
		args = append(args, source)
	} else {
		q += " ORDER BY scraped_at ASC"
	}

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []model.PricePoint
	for rows.Next() {
		var pp model.PricePoint
		if err := rows.Scan(&pp.Price, &pp.ScrapedAt); err != nil {
			return nil, err
		}
		points = append(points, pp)
	}

	return &model.PriceHistory{
		ProductID: productID,
		Source:    source,
		Points:    points,
	}, nil
}

func (r *PriceRepo) GetBestDeals(ctx context.Context, categoryID *int, limit int, minDiscountPct float64) ([]model.Deal, error) {
	q := `
		SELECT p.id, p.name, p.slug, p.images,
		       pe.price AS current_price, pe.source_name, pe.source_url,
		       p.updated_at
		FROM products p
		JOIN cheapest_prices pe ON pe.product_id = p.id
		WHERE p.is_active = true`

	args := []any{}
	i := 1

	if categoryID != nil {
		q += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = $%d)", i)
		args = append(args, *categoryID)
		i++
	}

	q += fmt.Sprintf(" ORDER BY pe.price ASC LIMIT $%d", i)
	args = append(args, limit)

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deals []model.Deal
	for rows.Next() {
		var d model.Deal
		var images []string
		if err := rows.Scan(&d.ProductID, &d.ProductName, &d.ProductSlug, &images,
			&d.CurrentPrice, &d.SourceName, &d.SourceURL, &d.UpdatedAt); err != nil {
			return nil, err
		}
		d.Images = images
		deals = append(deals, d)
	}
	return deals, nil
}
