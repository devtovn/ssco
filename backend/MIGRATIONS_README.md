# Database Migrations

This directory contains database migrations managed by `node-pg-migrate`.

## Running Migrations

### Prerequisites
- PostgreSQL database must be running
- `DATABASE_URL` environment variable must be set

### Commands

From the project root directory:

```bash
# Run all pending migrations
node node_modules/node-pg-migrate/bin/node-pg-migrate.js up --migrations-dir backend/migrations

# Rollback the last migration
node node_modules/node-pg-migrate/bin/node-pg-migrate.js down --migrations-dir backend/migrations

# Create a new migration
node node_modules/node-pg-migrate/bin/node-pg-migrate.js create my-migration-name --migrations-dir backend/migrations
```

From the backend directory (with npm scripts):

```bash
# Run all pending migrations
npm run migrate:up

# Rollback the last migration
npm run migrate:down

# Create a new migration
npm run migrate:create my-migration-name
```

### Environment Variables

Set the `DATABASE_URL` environment variable before running migrations:

**PowerShell:**
```powershell
$env:DATABASE_URL="postgresql://pricecompare:pricecompare_dev_password@localhost:5432/price_comparison"
```

**Bash:**
```bash
export DATABASE_URL="postgresql://pricecompare:pricecompare_dev_password@localhost:5432/price_comparison"
```

## Migration Files

### 1704000000000_create-core-tables.ts

Creates the core database tables:

- **categories**: Hierarchical product categories with Vietnamese and English names
- **products**: Product information with specifications, images, and keywords
- **product_categories**: Junction table for many-to-many product-category relationships
- **price_entries**: Price data from multiple sources with scraping timestamps

**Indexes Created:**
- Category indexes: parent_id, slug, level, is_active
- Product indexes: category, brand, keywords (GIN), name full-text search (GIN)
- Product_categories indexes: product_id, category_id, is_primary
- Price_entries indexes: product_id, source_name, scraped_at

**Default Data:**
Seeds 10 default product categories:
1. Điện lạnh (Refrigeration & Air Conditioning)
2. Thiết bị gia dụng (Home Appliances)
3. Điện thoại (Mobile Phones)
4. Máy tính bảng (Tablets)
5. Laptop
6. Cơ khí (Mechanical Equipment)
7. Thiết bị văn phòng (Office Equipment)
8. Âm thanh & Hình ảnh (Audio & Video)
9. Phụ kiện điện tử (Electronic Accessories)
10. Đồ gia dụng nhà bếp (Kitchen Appliances)

## Configuration

Migration configuration is stored in `backend/.migrationrc.json`:

```json
{
  "database-url-var": "DATABASE_URL",
  "migrations-dir": "migrations",
  "migrations-table": "pgmigrations",
  "migration-file-language": "ts",
  "dir": "migrations",
  "check-order": true,
  "timestamp": true
}
```

## Verification

To verify migrations were applied successfully:

```bash
# List all tables
docker exec price-comparison-postgres psql -U pricecompare -d price_comparison -c "\dt"

# List all indexes
docker exec price-comparison-postgres psql -U pricecompare -d price_comparison -c "\di"

# View categories
docker exec price-comparison-postgres psql -U pricecompare -d price_comparison -c "SELECT name_vi, name_en, slug FROM categories ORDER BY display_order;"
```
