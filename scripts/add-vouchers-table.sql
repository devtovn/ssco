-- Migration: Add vouchers table
-- Run this script against the pricecompare database

CREATE TABLE IF NOT EXISTS vouchers (
  id          TEXT        PRIMARY KEY DEFAULT generate_ulid(),
  code        VARCHAR(100) NOT NULL,
  description TEXT         NOT NULL,
  source      VARCHAR(50)  NOT NULL,   -- tiki | shopee | lazada | tiktok
  type        VARCHAR(20)  NOT NULL CHECK (type IN ('cashback', 'shipping', 'discount')),
  expires_at  DATE         NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vouchers_code_source_uidx ON vouchers (code, source);
CREATE INDEX IF NOT EXISTS vouchers_source_idx ON vouchers (source);
CREATE INDEX IF NOT EXISTS vouchers_expires_idx ON vouchers (expires_at);

-- Seed existing hardcoded vouchers
INSERT INTO vouchers (code, description, source, type, expires_at) VALUES
  ('TIKIBACK10', 'Hoàn 10% tối đa 100k cho đơn từ 500k',       'tiki',   'cashback', '2026-05-31'),
  ('FREESHIP99', 'Miễn phí vận chuyển toàn quốc',               'tiki',   'shipping', '2026-05-30'),
  ('DEAL15OFF',  'Giảm 15% tối đa 200k cho Điện thoại',         'tiki',   'discount', '2026-05-25'),
  ('LAZSAVE50K', 'Giảm 50k cho đơn từ 500k',                    'lazada', 'discount', '2026-05-28'),
  ('LAZFS0',     'Freeship không giới hạn',                      'lazada', 'shipping', '2026-05-31'),
  ('SPBACK15',   'Hoàn xu 15% tối đa 150k',                     'shopee', 'cashback', '2026-05-29'),
  ('SPSAVE200',  'Giảm 200k cho đơn từ 1 triệu',                'shopee', 'discount', '2026-05-26'),
  ('TTKNEW30',   'Giảm 30% cho lần đầu mua trên TikTok Shop',   'tiktok', 'discount', '2026-05-31')
ON CONFLICT (code, source) DO NOTHING;
