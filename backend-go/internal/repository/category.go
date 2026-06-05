package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ssco/backend/internal/model"
)

const categorySelect = `SELECT id, name_vi, name_en, slug, description, icon, parent_id,
	level, display_order, is_active, created_at, updated_at FROM categories`

type CategoryRepo struct {
	db *pgxpool.Pool
}

func NewCategoryRepo(db *pgxpool.Pool) *CategoryRepo {
	return &CategoryRepo{db: db}
}

func scanCategory(row interface{ Scan(...any) error }) (model.Category, error) {
	var c model.Category
	return c, row.Scan(
		&c.ID, &c.Name, &c.NameEn, &c.Slug, &c.Description, &c.Icon,
		&c.ParentID, &c.Level, &c.DisplayOrder, &c.IsActive,
		&c.CreatedAt, &c.UpdatedAt,
	)
}

func (r *CategoryRepo) GetTree(ctx context.Context, onlyActive bool) ([]model.Category, error) {
	q := categorySelect
	if onlyActive {
		q += " WHERE is_active = true"
	}
	q += " ORDER BY display_order, name_vi"

	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flat []model.Category
	for rows.Next() {
		c, err := scanCategory(rows)
		if err != nil {
			return nil, err
		}
		flat = append(flat, c)
	}
	return buildTree(flat), nil
}

func (r *CategoryRepo) GetBySlug(ctx context.Context, slug string) (*model.Category, error) {
	row := r.db.QueryRow(ctx, categorySelect+` WHERE slug = $1`, slug)
	c, err := scanCategory(row)
	if err != nil {
		return nil, fmt.Errorf("category not found")
	}
	return &c, nil
}

func (r *CategoryRepo) GetByID(ctx context.Context, id string) (*model.Category, error) {
	row := r.db.QueryRow(ctx, categorySelect+` WHERE id = $1`, id)
	c, err := scanCategory(row)
	if err != nil {
		return nil, fmt.Errorf("category not found")
	}
	return &c, nil
}

func (r *CategoryRepo) Create(ctx context.Context, c *model.Category) (*model.Category, error) {
	row := r.db.QueryRow(ctx,
		`INSERT INTO categories (name_vi, name_en, slug, description, icon, parent_id, display_order, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at, updated_at`,
		c.Name, c.NameEn, c.Slug, c.Description, c.Icon, c.ParentID, c.DisplayOrder, c.IsActive)
	if err := row.Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CategoryRepo) Update(ctx context.Context, id string, c *model.Category) (*model.Category, error) {
	_, err := r.db.Exec(ctx,
		`UPDATE categories SET name_vi=$1, name_en=$2, slug=$3, description=$4, icon=$5,
		 parent_id=$6, display_order=$7, is_active=$8, updated_at=NOW() WHERE id=$9`,
		c.Name, c.NameEn, c.Slug, c.Description, c.Icon,
		c.ParentID, c.DisplayOrder, c.IsActive, id)
	if err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}

func (r *CategoryRepo) Delete(ctx context.Context, id string) error {
	var childCount int
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM categories WHERE parent_id = $1`, id).Scan(&childCount)
	if childCount > 0 {
		return fmt.Errorf("cannot delete category with subcategories")
	}
	_, err := r.db.Exec(ctx, `DELETE FROM categories WHERE id = $1`, id)
	return err
}

func (r *CategoryRepo) GetProductCount(ctx context.Context, id string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(DISTINCT product_id) FROM product_categories WHERE category_id = $1`, id).Scan(&count)
	return count, err
}

func buildTree(flat []model.Category) []model.Category {
	index := make(map[string]*model.Category, len(flat))
	for i := range flat {
		flat[i].Children = []model.Category{}
		index[flat[i].ID] = &flat[i]
	}
	var roots []model.Category
	for i := range flat {
		c := &flat[i]
		if c.ParentID == nil {
			roots = append(roots, *c)
		} else if parent, ok := index[*c.ParentID]; ok {
			parent.Children = append(parent.Children, *c)
		}
	}
	return roots
}
