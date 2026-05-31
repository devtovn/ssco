-- Migration: link gadget_devices → products
-- Run: Get-Content scripts\add-gadget-product-link.sql | docker exec -i price-comparison-postgres psql -U pricecompare -d price_comparison

ALTER TABLE gadget_devices
  ADD COLUMN IF NOT EXISTS product_id char(26) REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gadget_devices_product_id ON gadget_devices(product_id);
