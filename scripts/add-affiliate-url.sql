-- Migration: add affiliate_url to price_entries
-- Run once: psql -d your_db -f scripts/add-affiliate-url.sql

ALTER TABLE price_entries
  ADD COLUMN IF NOT EXISTS affiliate_url TEXT DEFAULT NULL;

COMMENT ON COLUMN price_entries.affiliate_url IS
  'Pre-generated affiliate link (e.g. s.shopee.vn/XXX). Stored at seed time. '
  'Falls back to source_url at redirect if NULL.';
