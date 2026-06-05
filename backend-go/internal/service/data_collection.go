package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/model"
)

type DataCollectionService struct {
	db          *pgxpool.Pool
	platformAPI *PlatformAPIService
}

func NewDataCollectionService(db *pgxpool.Pool, platformAPI *PlatformAPIService) *DataCollectionService {
	return &DataCollectionService{db: db, platformAPI: platformAPI}
}

// CollectFromAPIs collects products for a list of keywords and stores them.
func (s *DataCollectionService) CollectFromAPIs(ctx context.Context, keywords []string) (collected, stored int, errs []string) {
	for _, keyword := range keywords {
		results := s.platformAPI.SearchAll(ctx, keyword, 20)
		for _, products := range results {
			for _, p := range products {
				if err := s.validateProduct(p); err != nil {
					continue
				}
				if err := s.upsertProductWithPrice(ctx, p); err != nil {
					errs = append(errs, fmt.Sprintf("%s: %s", p.Name, err.Error()))
					continue
				}
				collected++
				stored++
			}
		}
	}
	return
}

// RefreshProductPrices fetches fresh prices for a single product.
func (s *DataCollectionService) RefreshProductPrices(ctx context.Context, productID string) (updated int, errs []string) {
	row := s.db.QueryRow(ctx, `SELECT id, name FROM products WHERE id = $1 AND is_active = true`, productID)
	var id, name string
	if err := row.Scan(&id, &name); err != nil {
		return 0, []string{"product not found"}
	}

	keyword := strings.Join(strings.Fields(name)[:min(5, len(strings.Fields(name)))], " ")
	results := s.platformAPI.SearchAll(ctx, keyword, 3)

	for _, products := range results {
		for _, p := range products {
			if p.Price <= 0 {
				continue
			}
			_, err := s.db.Exec(ctx,
				`INSERT INTO price_entries
				   (product_id, source_name, source_url, affiliate_url, price, currency, is_available, metadata, scraped_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
				id, p.Source, p.SourceURL, p.AffiliateURL, p.Price, p.Currency, p.IsAvailable,
				fmt.Sprintf(`{"externalId":"%s"}`, p.ExternalID))
			if err != nil {
				errs = append(errs, fmt.Sprintf("%s: %s", p.Source, err.Error()))
				continue
			}
			updated++
		}
	}
	return
}

// RefreshAllProductPrices refreshes prices for all active products.
func (s *DataCollectionService) RefreshAllProductPrices(ctx context.Context) {
	rows, err := s.db.Query(ctx, `SELECT id FROM products WHERE is_active = true ORDER BY updated_at ASC`)
	if err != nil {
		slog.Error("refresh all: query failed", "err", err)
		return
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}

	for _, id := range ids {
		updated, errs := s.RefreshProductPrices(ctx, id)
		if len(errs) > 0 {
			slog.Warn("refresh product prices", "productId", id, "errors", errs)
		} else {
			slog.Debug("refreshed product prices", "productId", id, "updated", updated)
		}
	}
}

func (s *DataCollectionService) validateProduct(p model.NormalizedProduct) error {
	if len(strings.TrimSpace(p.Name)) < 2 {
		return fmt.Errorf("name too short")
	}
	if p.Price <= 0 {
		return fmt.Errorf("price must be > 0")
	}
	if p.SourceURL == "" {
		return fmt.Errorf("source URL required")
	}
	return nil
}

func (s *DataCollectionService) upsertProductWithPrice(ctx context.Context, p model.NormalizedProduct) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var productID string
	err = tx.QueryRow(ctx,
		`SELECT p.id FROM products p
		 INNER JOIN price_entries pe ON pe.product_id = p.id
		 WHERE pe.source_name = $1 AND pe.metadata->>'externalId' = $2
		 LIMIT 1`,
		p.Source, p.ExternalID).Scan(&productID)

	if err != nil {
		// Insert new product
		var images interface{} = p.Images
		if len(p.Images) == 0 {
			images = nil
		}
		err = tx.QueryRow(ctx,
			`INSERT INTO products (name, description, category, brand, model, images, keywords, source_type)
			 VALUES ($1,$2,'general',$3,$4,$5,$6,'others')
			 RETURNING id`,
			p.Name, p.Description, p.Brand, p.Model, images,
			strings.Fields(p.Name)[:min(5, len(strings.Fields(p.Name)))]).Scan(&productID)
		if err != nil {
			return err
		}
	} else {
		// Update existing product
		_, _ = tx.Exec(ctx,
			`UPDATE products SET name=$1, brand=$2, images=$3, updated_at=NOW() WHERE id=$4`,
			p.Name, p.Brand, p.Images, productID)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO price_entries
		   (product_id, source_name, source_url, affiliate_url, price, currency, is_available, metadata, scraped_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
		productID, p.Source, p.SourceURL, p.AffiliateURL, p.Price,
		p.Currency, p.IsAvailable,
		fmt.Sprintf(`{"externalId":"%s","scrapedAt":"%s"}`, p.ExternalID, time.Now().Format(time.RFC3339)))
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
