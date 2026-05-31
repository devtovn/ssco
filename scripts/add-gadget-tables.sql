-- Migration: Gadget comparison module (GSMArena-style)
-- Run: Get-Content scripts\add-gadget-tables.sql | docker exec -i price-comparison-postgres psql -U pricecompare -d price_comparison

CREATE TABLE IF NOT EXISTS gadget_brands (
  id          char(26)     PRIMARY KEY DEFAULT generate_ulid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  logo_url    TEXT,
  description TEXT,
  country     VARCHAR(100),
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gadget_devices (
  id           char(26)     PRIMARY KEY DEFAULT generate_ulid(),
  brand_id     char(26)     NOT NULL REFERENCES gadget_brands(id) ON DELETE CASCADE,
  -- product_id links to products table (for price lookups) — added in add-gadget-product-link.sql
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(200) UNIQUE NOT NULL,
  -- category: mobile | tablet | smartwatch
  category     VARCHAR(50)  NOT NULL DEFAULT 'mobile',
  image_url    TEXT,
  gsmarena_url TEXT,
  announced    VARCHAR(100),
  released     VARCHAR(100),
  status       VARCHAR(100),
  -- Fallback JSONB specs (raw crawl output, used before normalized spec tables are populated)
  specs        JSONB        NOT NULL DEFAULT '{}',
  is_published BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_devices_brand_id  ON gadget_devices(brand_id);
CREATE INDEX IF NOT EXISTS idx_gadget_devices_category  ON gadget_devices(category);
CREATE INDEX IF NOT EXISTS idx_gadget_devices_published ON gadget_devices(is_published);
CREATE INDEX IF NOT EXISTS idx_gadget_devices_specs     ON gadget_devices USING GIN(specs);

-- Seed initial brands (logo_url to be updated by admin)
INSERT INTO gadget_brands (name, slug, country, sort_order) VALUES
  ('Apple',    'apple',    'USA',         1),
  ('Samsung',  'samsung',  'South Korea', 2),
  ('Xiaomi',   'xiaomi',   'China',       3),
  ('OPPO',     'oppo',     'China',       4),
  ('vivo',     'vivo',     'China',       5),
  ('realme',   'realme',   'China',       6),
  ('Google',   'google',   'USA',         7),
  ('OnePlus',  'oneplus',  'China',       8),
  ('Sony',     'sony',     'Japan',       9),
  ('ASUS',     'asus',     'Taiwan',     10),
  ('Nokia',    'nokia',    'Finland',    11),
  ('Motorola', 'motorola', 'USA',        12),
  ('Huawei',   'huawei',   'China',      13),
  ('Honor',    'honor',    'China',      14),
  ('Garmin',   'garmin',   'USA',        15)
ON CONFLICT (slug) DO NOTHING;
