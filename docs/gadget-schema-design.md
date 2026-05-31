# Gadget Spec Tables — Schema Design

> Thiết kế dựa trên thực tế parse trang Apple iPhone 17 Pro Max từ GSMArena.

## Nguyên tắc thiết kế

| Nguyên tắc | Chi tiết |
|-----------|---------|
| `product_id UUID PRIMARY KEY` | Mỗi spec table có 1-to-1 với `products`. Lookup O(1) qua PK. |
| Typed columns | `INT`, `NUMERIC`, `BOOLEAN` cho các trường có thể filter/sort |
| GIN index | Full-text search trên chipset, display type, sensors |
| Numeric index | Range filter: battery ≥ 5000mAh, RAM ≥ 8GB, display ≥ 120Hz |
| Boolean index | Filter: NFC có/không, jack có/không, wireless charge có/không |
| Tất cả bảng dùng được cho `source_type = 'other'` | Laptop có thể dùng `gadget_platform`, `gadget_memory`, `gadget_display` |

---

## Tables

### `products` (bảng gốc — mở rộng)
```sql
source_type     VARCHAR(20)  -- 'gsmarena' | 'other'
device_category VARCHAR(50)  -- 'mobile' | 'tablet' | 'smartwatch' | 'laptop' | NULL
```

### 1. `gadget_network`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| technology | TEXT | "GSM / HSPA / LTE / 5G" | FTS |
| bands_2g | TEXT | "GSM 850 / 900 / 1800 / 1900" | |
| bands_3g | TEXT | "HSDPA 850 / 900 / 1700(AWS)" | |
| bands_4g | TEXT | "1, 2, 3, 4, 5, 7, 8, ..." | |
| bands_5g | TEXT | "1, 2, 3, 5, ... SA/NSA/Sub6" | NOT NULL = 5G |
| speed | TEXT | "HSPA, LTE, 5G, EV-DO Rev.A" | |

### 2. `gadget_launch`
| Column | Type | Sample |
|--------|------|--------|
| product_id | UUID PK | |
| announced | TEXT | "2025, September" |
| status | TEXT | "Available. Released 2025, September 19" |

### 3. `gadget_body`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| dimensions | TEXT | "163.0 x 77.6 x 8.25 mm" | |
| weight_grams | NUMERIC(7,2) | 233.00 | ✅ Range |
| build | TEXT | "Glass front, aluminum frame" | |
| sim | TEXT | "Nano-SIM + eSIM (International)" | |
| water_resistance | TEXT | "IP68 up to 6m/30min" | FTS |

### 4. `gadget_display`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| type | TEXT | "LTPO Super Retina XDR OLED" | ✅ FTS |
| size_inches | NUMERIC(4,2) | 6.90 | ✅ Range |
| resolution | TEXT | "1320 x 2868 pixels, ~460 ppi" | |
| protection | TEXT | "Ceramic Shield 2, Mohs 5" | |
| features | TEXT | "ProMotion, Always-On, HDR10" | |
| refresh_rate_hz | INT | 120 | ✅ Range |
| ppi | INT | 460 | ✅ Range |

### 5. `gadget_platform`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| os | TEXT | "iOS 18.2" | FTS |
| chipset | TEXT | "Apple A19 Pro (3 nm)" | ✅ FTS |
| cpu | TEXT | "Hexa-core (2x4.26 GHz + 4x2.60 GHz)" | |
| gpu | TEXT | "Apple GPU (6-core graphics)" | |

### 6. `gadget_memory`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| card_slot | TEXT | "No" / "microSDXC" | |
| internal | TEXT | "256GB 12GB RAM, 512GB 12GB RAM" | |
| ram_gb | INT | 12 | ✅ Range |
| storage_min_gb | INT | 256 | ✅ Range |
| storage_type | TEXT | "NVMe" / "UFS 4.0" | |

### 7. `gadget_main_camera`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| modules | TEXT | "48MP f/1.8 + 48MP f/2.8 + 12MP f/2.2" | |
| megapixels_main | INT | 48 | ✅ Range |
| aperture_main | TEXT | "f/1.8" | |
| features | TEXT | "Dual-LED, HDR, OIS, PDAF" | |
| video | TEXT | "4K@120fps, ProRes, Dolby Vision" | |

### 8. `gadget_selfie_camera`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| modules | TEXT | "24 MP, f/1.9, autofocus" | |
| megapixels | INT | 24 | ✅ Range |
| features | TEXT | "HDR, Dolby Vision HDR" | |
| video | TEXT | "4K@60fps, gyro-EIS" | |

### 9. `gadget_sound`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| loudspeaker | TEXT | "Yes, with stereo speakers" | |
| has_stereo | BOOLEAN | true | ✅ |
| jack_3_5mm | TEXT | "No" | |
| has_jack | BOOLEAN | false | ✅ |

### 10. `gadget_comms`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| wlan | TEXT | "Wi-Fi 802.11 a/b/g/n/ac/6e/7" | FTS |
| wifi_version | TEXT | "Wi-Fi 7" | ✅ |
| bluetooth | TEXT | "6.0, A2DP, LE, aptX" | |
| bt_version | NUMERIC(3,1) | 6.0 | ✅ Range |
| positioning | TEXT | "GPS (L1+L5), GLONASS, GALILEO, BDS" | |
| nfc | TEXT | "Yes" | |
| has_nfc | BOOLEAN | true | ✅ |
| radio | TEXT | "No" | |
| usb | TEXT | "USB Type-C 3.2 Gen 2, DisplayPort" | |
| usb_version | TEXT | "USB 3.2 Gen 2" | ✅ |

### 11. `gadget_features`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| sensors | TEXT | "Face ID, accelerometer, gyro, barometer, compass" | ✅ FTS |
| other | TEXT | "Ultra Wideband (UWB), Emergency SOS via satellite" | FTS |

### 12. `gadget_battery`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| type | TEXT | "Li-Ion" / "Li-Po" | |
| capacity_mah | INT | 4685 | ✅ Range |
| charging | TEXT | "Wired 50W, 25W MagSafe/Qi2" | |
| charging_wired_w | INT | 50 | ✅ Range |
| has_wireless | BOOLEAN | true | ✅ |
| wireless_w | INT | 25 | ✅ Range |
| has_reverse | BOOLEAN | false | ✅ |

### 13. `gadget_misc`
| Column | Type | Sample |
|--------|------|--------|
| product_id | UUID PK | |
| colors | TEXT | "Black Titanium, White Titanium, Desert Titanium" |
| models | TEXT | "A3293, A3294 (US/CA); A3527 (China)" |
| sar_us | TEXT | "1.19 W/kg (head)" |
| sar_eu | TEXT | "0.94 W/kg (head)" |
| price_usd | TEXT | "From $1299" |

### 14. `gadget_tests`
| Column | Type | Sample | Filter? |
|--------|------|--------|---------|
| product_id | UUID PK | | |
| display_score | TEXT | "Excellent" | |
| loudspeaker_lufs | TEXT | "-26.1 LUFS (Very good)" | |
| battery_hours | NUMERIC(5,1) | 131.0 | ✅ Range |

---

## Kết nối với `products` table

```
products (id UUID PK, source_type, device_category, ...)
    │
    ├─ gadget_network      (product_id PK FK)   -- 1-to-1
    ├─ gadget_launch       (product_id PK FK)
    ├─ gadget_body         (product_id PK FK)
    ├─ gadget_display      (product_id PK FK)
    ├─ gadget_platform     (product_id PK FK)
    ├─ gadget_memory       (product_id PK FK)
    ├─ gadget_main_camera  (product_id PK FK)
    ├─ gadget_selfie_camera(product_id PK FK)
    ├─ gadget_sound        (product_id PK FK)
    ├─ gadget_comms        (product_id PK FK)
    ├─ gadget_features     (product_id PK FK)
    ├─ gadget_battery      (product_id PK FK)
    ├─ gadget_misc         (product_id PK FK)
    └─ gadget_tests        (product_id PK FK)   -- optional (test scores)
```

**Tốc độ lookup:**
```sql
-- Lấy toàn bộ specs 1 sản phẩm → 14 PK lookups (tất cả O(1))
SELECT * FROM gadget_display WHERE product_id = $1;
SELECT * FROM gadget_battery WHERE product_id = $1;
-- ...

-- Filter nâng cao (JOIN chỉ sections cần thiết):
SELECT p.name, gd.size_inches, gbat.capacity_mah, gm.ram_gb
FROM products p
JOIN gadget_display gd ON gd.product_id = p.id AND gd.size_inches >= 6.0
JOIN gadget_battery gbat ON gbat.product_id = p.id AND gbat.capacity_mah >= 4000
JOIN gadget_memory gm ON gm.product_id = p.id AND gm.ram_gb >= 8
WHERE p.device_category = 'mobile';
-- → 3 index scans + hash join, rất nhanh
```

---

## Mở rộng cho `source_type = 'other'`

Laptop không phải GSMArena cũng có thể dùng:
- `gadget_platform` → OS, CPU, GPU, Chipset
- `gadget_display` → kích thước, độ phân giải, refresh rate
- `gadget_memory` → RAM, SSD
- `gadget_battery` → dung lượng, sạc
- `gadget_comms` → WiFi, Bluetooth, USB

Chỉ cần `products.source_type = 'other'` và điền các bảng tương ứng.

---

## Migration thực thi

```powershell
Get-Content scripts\add-gadget-spec-tables.sql | docker exec -i price-comparison-postgres psql -U pricecompare -d price_comparison
```
