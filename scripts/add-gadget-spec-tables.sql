-- =============================================================================
-- Migration: Normalized gadget spec tables
-- PK/FK type: char(26) using generate_ulid() — consistent with all other tables
--
-- Design principles:
--   1. product_id char(26) PRIMARY KEY → 1-to-1 with products, O(1) FK lookup
--   2. Typed columns (INT, NUMERIC, BOOLEAN) → enables range/filter queries
--   3. GIN indexes on key text fields → fast full-text search
--   4. All tables usable for ANY product (source_type = 'gsmarena' OR 'other')
-- =============================================================================
-- Run: Get-Content scripts\add-gadget-spec-tables.sql | docker exec -i kombe-postgres psql -U kombe -d kombe

-- ── 0. Add source_type + device_category to products ─────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source_type      VARCHAR(20)  DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS device_category  VARCHAR(50)  DEFAULT NULL;

COMMENT ON COLUMN products.source_type     IS 'gsmarena | other';
COMMENT ON COLUMN products.device_category IS 'mobile | tablet | smartwatch | laptop | NULL';

CREATE INDEX IF NOT EXISTS idx_products_source_type     ON products(source_type);
CREATE INDEX IF NOT EXISTS idx_products_device_category ON products(device_category);

-- ── 1. gadget_network ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_network (
  product_id    char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  technology    TEXT,          -- "GSM / HSPA / LTE / 5G"
  bands_2g      TEXT,          -- "GSM 850 / 900 / 1800 / 1900"
  bands_3g      TEXT,          -- "HSDPA 850 / 900 / 1700(AWS) / 1900 / 2100"
  bands_4g      TEXT,          -- "1, 2, 3, 4, 5, 7, ..."
  bands_5g      TEXT,          -- "1, 2, 3, 5, 7, ... SA/NSA/Sub6"
  speed         TEXT,          -- "HSPA, LTE, 5G, EV-DO Rev.A"
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. gadget_launch ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_launch (
  product_id    char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  announced     TEXT,          -- "2025, September"
  status        TEXT,          -- "Available. Released 2025, September 19"
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. gadget_body ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_body (
  product_id        char(26)        PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  dimensions        TEXT,
  weight_grams      NUMERIC(7,2),   -- 233.00 → filter: WHERE weight_grams < 200
  build             TEXT,
  sim               TEXT,
  water_resistance  TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_body_weight ON gadget_body(weight_grams);

-- ── 4. gadget_display ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_display (
  product_id       char(26)       PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  type             TEXT,          -- "LTPO Super Retina XDR OLED"
  size_inches      NUMERIC(4,2),  -- 6.90 → filter: WHERE size_inches >= 6.5
  resolution       TEXT,          -- "1320 x 2868 pixels, ~460 ppi"
  protection       TEXT,
  features         TEXT,          -- "ProMotion, Always-On, HDR10"
  refresh_rate_hz  INT,           -- 120 → filter: WHERE refresh_rate_hz >= 90
  ppi              INT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_display_size        ON gadget_display(size_inches);
CREATE INDEX IF NOT EXISTS idx_gadget_display_refresh     ON gadget_display(refresh_rate_hz);
CREATE INDEX IF NOT EXISTS idx_gadget_display_type_fts    ON gadget_display
  USING GIN(to_tsvector('simple', coalesce(type, '')));

-- ── 5. gadget_platform ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_platform (
  product_id    char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  os            TEXT,          -- "iOS 18.2"
  chipset       TEXT,          -- "Apple A19 Pro (3 nm)"
  cpu           TEXT,          -- "Hexa-core (2x4.26 GHz + 4x2.60 GHz)"
  gpu           TEXT,          -- "Apple GPU (6-core graphics)"
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_platform_fts ON gadget_platform
  USING GIN(to_tsvector('simple',
    coalesce(chipset, '') || ' ' || coalesce(cpu, '') || ' ' || coalesce(os, '')
  ));

-- ── 6. gadget_memory ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_memory (
  product_id      char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  card_slot       TEXT,        -- "No" | "microSDXC (uses shared SIM slot)"
  internal        TEXT,        -- "256GB 12GB RAM, 512GB 12GB RAM, 1TB 12GB RAM"
  ram_gb          INT,         -- 12 → filter: WHERE ram_gb >= 8
  storage_min_gb  INT,         -- 256 → filter: WHERE storage_min_gb >= 128
  storage_type    TEXT,        -- "NVMe" | "UFS 4.0" | "UFS 3.1"
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_memory_ram     ON gadget_memory(ram_gb);
CREATE INDEX IF NOT EXISTS idx_gadget_memory_storage ON gadget_memory(storage_min_gb);

-- ── 7. gadget_main_camera ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_main_camera (
  product_id       char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  modules          TEXT,        -- "48MP f/1.8 + 48MP f/2.8 (periscope) + 12MP f/2.2"
  megapixels_main  INT,         -- 48 → filter: WHERE megapixels_main >= 50
  aperture_main    TEXT,        -- "f/1.8"
  features         TEXT,        -- "Dual-LED, HDR, OIS, PDAF"
  video            TEXT,        -- "4K@120fps, ProRes, Dolby Vision"
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_main_camera_mp ON gadget_main_camera(megapixels_main);

-- ── 8. gadget_selfie_camera ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_selfie_camera (
  product_id    char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  modules       TEXT,        -- "24 MP, f/1.9, 23mm, autofocus"
  megapixels    INT,         -- 24
  features      TEXT,
  video         TEXT,        -- "4K@60fps, gyro-EIS"
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. gadget_sound ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_sound (
  product_id    char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  loudspeaker   TEXT,        -- "Yes, with stereo speakers"
  has_stereo    BOOLEAN,     -- true → filter: WHERE has_stereo = true
  jack_3_5mm    TEXT,        -- "No" | "Yes"
  has_jack      BOOLEAN,     -- false → filter: WHERE has_jack = true
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_sound_jack   ON gadget_sound(has_jack);
CREATE INDEX IF NOT EXISTS idx_gadget_sound_stereo ON gadget_sound(has_stereo);

-- ── 10. gadget_comms ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_comms (
  product_id    char(26)       PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  wlan          TEXT,          -- "Wi-Fi 802.11 a/b/g/n/ac/6e/7, tri-band, hotspot"
  wifi_version  TEXT,          -- "Wi-Fi 7" | "Wi-Fi 6E"
  bluetooth     TEXT,          -- "6.0, A2DP, LE, aptX"
  bt_version    NUMERIC(3,1),  -- 6.0 → filter: WHERE bt_version >= 5.0
  positioning   TEXT,          -- "GPS (L1+L5), GLONASS, GALILEO, BDS, QZSS"
  nfc           TEXT,          -- "Yes" | "No"
  has_nfc       BOOLEAN,       -- true → filter: WHERE has_nfc = true
  radio         TEXT,          -- "No" | "FM radio"
  usb           TEXT,          -- "USB Type-C 3.2 Gen 2, DisplayPort"
  usb_version   TEXT,          -- "USB 3.2 Gen 2"
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_comms_nfc      ON gadget_comms(has_nfc);
CREATE INDEX IF NOT EXISTS idx_gadget_comms_bt       ON gadget_comms(bt_version);
CREATE INDEX IF NOT EXISTS idx_gadget_comms_wlan_fts ON gadget_comms
  USING GIN(to_tsvector('simple', coalesce(wlan, '') || ' ' || coalesce(wifi_version, '')));

-- ── 11. gadget_features ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_features (
  product_id    char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  sensors       TEXT,        -- "Face ID, accelerometer, gyro, barometer, compass"
  other         TEXT,        -- "Ultra Wideband (UWB), Emergency SOS via satellite"
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_features_fts ON gadget_features
  USING GIN(to_tsvector('simple',
    coalesce(sensors, '') || ' ' || coalesce(other, '')
  ));

-- ── 12. gadget_battery ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_battery (
  product_id        char(26)      PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  type              TEXT,          -- "Li-Ion" | "Li-Po"
  capacity_mah      INT,           -- 4685 → filter: WHERE capacity_mah >= 5000
  charging          TEXT,          -- "Wired 50W, 25W MagSafe/Qi2"
  charging_wired_w  INT,           -- 50 → filter: WHERE charging_wired_w >= 65
  has_wireless      BOOLEAN,       -- true
  wireless_w        INT,           -- 25
  has_reverse       BOOLEAN,       -- false
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_battery_capacity   ON gadget_battery(capacity_mah);
CREATE INDEX IF NOT EXISTS idx_gadget_battery_wireless   ON gadget_battery(has_wireless);
CREATE INDEX IF NOT EXISTS idx_gadget_battery_charging_w ON gadget_battery(charging_wired_w);

-- ── 13. gadget_misc ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_misc (
  product_id    char(26)    PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  colors        TEXT,        -- "Black Titanium, White Titanium, Desert Titanium"
  models        TEXT,        -- "A3293, A3294 (US/CA); A3527 (China)"
  sar_us        TEXT,        -- "1.19 W/kg (head)"
  sar_eu        TEXT,        -- "0.94 W/kg (head)"
  price_usd     TEXT,        -- "From $1299"
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 14. gadget_tests ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gadget_tests (
  product_id        char(26)        PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  display_score     TEXT,
  loudspeaker_lufs  TEXT,           -- "-26.1 LUFS (Very good)"
  battery_hours     NUMERIC(5,1),   -- 131.0 → filter: WHERE battery_hours >= 100
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadget_tests_battery ON gadget_tests(battery_hours);

-- =============================================================================
-- CONVENIENCE VIEW (use sparingly — 14 LEFT JOINs)
-- For production queries, join only the sections you need.
-- =============================================================================

CREATE OR REPLACE VIEW product_gadget_specs AS
SELECT
  p.id                      AS product_id,
  p.name                    AS product_name,
  p.source_type,
  p.device_category,
  gn.technology, gn.bands_2g, gn.bands_3g, gn.bands_4g, gn.bands_5g, gn.speed,
  gl.announced, gl.status   AS launch_status,
  gb.dimensions, gb.weight_grams, gb.build, gb.sim, gb.water_resistance,
  gd.type  AS display_type, gd.size_inches, gd.resolution,
  gd.refresh_rate_hz, gd.ppi, gd.protection, gd.features AS display_features,
  gpl.os, gpl.chipset, gpl.cpu, gpl.gpu,
  gm.card_slot, gm.internal, gm.ram_gb, gm.storage_min_gb, gm.storage_type,
  gmc.modules AS main_camera, gmc.megapixels_main, gmc.features AS main_cam_features, gmc.video AS main_cam_video,
  gsc.modules AS selfie_camera, gsc.megapixels AS selfie_mp, gsc.video AS selfie_video,
  gs.loudspeaker, gs.has_stereo, gs.jack_3_5mm, gs.has_jack,
  gc.wlan, gc.wifi_version, gc.bluetooth, gc.bt_version,
  gc.positioning, gc.has_nfc, gc.radio, gc.usb, gc.usb_version,
  gf.sensors, gf.other AS other_features,
  gbat.type AS battery_type, gbat.capacity_mah, gbat.charging,
  gbat.charging_wired_w, gbat.has_wireless, gbat.wireless_w,
  gmi.colors, gmi.models, gmi.sar_us, gmi.sar_eu, gmi.price_usd,
  gt.display_score, gt.loudspeaker_lufs, gt.battery_hours
FROM products p
LEFT JOIN gadget_network       gn   ON gn.product_id   = p.id
LEFT JOIN gadget_launch        gl   ON gl.product_id   = p.id
LEFT JOIN gadget_body          gb   ON gb.product_id   = p.id
LEFT JOIN gadget_display       gd   ON gd.product_id   = p.id
LEFT JOIN gadget_platform      gpl  ON gpl.product_id  = p.id
LEFT JOIN gadget_memory        gm   ON gm.product_id   = p.id
LEFT JOIN gadget_main_camera   gmc  ON gmc.product_id  = p.id
LEFT JOIN gadget_selfie_camera gsc  ON gsc.product_id  = p.id
LEFT JOIN gadget_sound         gs   ON gs.product_id   = p.id
LEFT JOIN gadget_comms         gc   ON gc.product_id   = p.id
LEFT JOIN gadget_features      gf   ON gf.product_id   = p.id
LEFT JOIN gadget_battery       gbat ON gbat.product_id = p.id
LEFT JOIN gadget_misc          gmi  ON gmi.product_id  = p.id
LEFT JOIN gadget_tests         gt   ON gt.product_id   = p.id;
