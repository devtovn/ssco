-- DEPRECATED: use migration 1748800000000_affiliate-accesstrade-schema.ts instead.
-- Kept for manual repair on DBs that ran this before the official migration.
-- Run: Get-Content scripts\add-affiliate-credentials.sql | docker exec -i kombe-postgres psql -U kombe -d kombe

ALTER TABLE affiliate_configs
  ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT NULL;

COMMENT ON COLUMN affiliate_configs.credentials IS
  'Platform-specific API credentials stored as JSON.
   tiki:    { "refCode": "xxx" }
   shopee:  { "pubId": "12345678", "accessToken": "eyJ..." }
   tiktok:  { "appKey": "xxx", "accessToken": "yyy" }
   lazada:  { "appToken": "xxx", "campaignId": "yyy" }';
