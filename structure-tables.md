# Database Structure — Kombe (SSCO)

> PostgreSQL · PK type: `char(26)` ULID · Timezone: Asia/Ho_Chi_Minh

---

## ER Diagram

```mermaid
erDiagram
    %% ══════════════ CORE ══════════════
    categories ||--o{ categories : "parent_id (self-ref)"
    categories ||--o{ product_categories : "category_id"
    products ||--o{ product_categories : "product_id"
    products ||--o{ price_entries : "product_id"
    products ||--o{ articles : "product_id"
    products ||--o{ affiliate_link_clicks : "product_id"
    products ||--o{ user_interactions : "product_id"
    products ||--o{ gadget_devices : "product_id"

    %% ══════════════ GADGET SPECS (1:1 với products) ══════════════
    products ||--o| gadget_network : "product_id"
    products ||--o| gadget_launch : "product_id"
    products ||--o| gadget_body : "product_id"
    products ||--o| gadget_display : "product_id"
    products ||--o| gadget_platform : "product_id"
    products ||--o| gadget_memory : "product_id"
    products ||--o| gadget_main_camera : "product_id"
    products ||--o| gadget_selfie_camera : "product_id"
    products ||--o| gadget_sound : "product_id"
    products ||--o| gadget_comms : "product_id"
    products ||--o| gadget_features : "product_id"
    products ||--o| gadget_battery : "product_id"
    products ||--o| gadget_misc : "product_id"
    products ||--o| gadget_tests : "product_id"

    %% ══════════════ GADGET BRANDS ══════════════
    gadget_brands ||--o{ gadget_devices : "brand_id"

    %% ══════════════ AFFILIATE & ADS ══════════════
    affiliate_publishers ||--o{ affiliate_configs : "publisher_id"
    affiliate_configs ||--o{ affiliate_campaigns : "affiliate_config_id"
    affiliate_configs ||--o{ affiliate_link_clicks : "affiliate_config_id"
    affiliate_campaigns ||--o{ affiliate_link_clicks : "campaign_id"
    affiliate_campaigns ||--o{ price_entries : "affiliate_campaign_id"
    ad_zones ||--o{ advertisements : "zone_id"

    %% ══════════════ USER & CONTENT ══════════════
    users ||--o{ articles : "reviewer_id, created_by"
    users ||--o{ article_versions : "edited_by"
    articles ||--o{ article_versions : "article_id"

    %% ══════════════ TABLE SHAPES ══════════════
    categories {
        char26 id PK
        varchar name_vi
        varchar name_en
        varchar slug UK
        char26 parent_id FK
        int level
        int display_order
        boolean is_active
    }

    products {
        char26 id PK
        varchar slug UK
        varchar name
        varchar category
        varchar brand
        varchar model
        jsonb specifications
        text_arr images
        text_arr keywords
        text_arr hidden_sources
        varchar source_type
        varchar device_category
        boolean is_active
    }

    product_categories {
        char26 product_id PK_FK
        char26 category_id PK_FK
        boolean is_primary
    }

    price_entries {
        char26 id PK
        char26 product_id FK
        varchar source_name
        text source_url
        text affiliate_url
        char26 affiliate_campaign_id FK
        timestamp affiliate_url_at
        decimal price
        varchar currency
        boolean is_available
        jsonb metadata
        timestamp scraped_at
    }

    price_sources {
        char26 id PK
        varchar name
        varchar source_type
        varchar platform
        text base_url
        boolean is_active
        decimal reliability_score
        jsonb config
    }

    vouchers {
        text id PK
        varchar code
        text description
        varchar source
        varchar type
        date expires_at
        boolean is_active
    }

    website_config {
        int id PK
        jsonb config_data
    }

    users {
        char26 id PK
        varchar email UK
        varchar password_hash
        varchar role
        jsonb permissions
        boolean is_active
    }

    articles {
        char26 id PK
        char26 product_id FK
        char26 reviewer_id FK
        char26 created_by FK
        varchar title
        text content
        jsonb seo_metadata
        varchar status
        int version
        text rejection_reason
        timestamp published_at
    }

    article_versions {
        char26 id PK
        char26 article_id FK
        char26 edited_by FK
        int version
        varchar title
        text content
        jsonb seo_metadata
    }

    affiliate_publishers {
        char26 id PK
        varchar provider UK
        varchar display_name
        text app_token
        text api_base_url
        boolean is_enabled
        jsonb metadata
    }

    affiliate_configs {
        char26 id PK
        char26 publisher_id FK
        varchar platform_id UK
        varchar platform_name
        varchar provider
        text_arr domain_patterns
        varchar refer_code
        text link_template
        jsonb link_format
        jsonb credentials
        boolean is_enabled
        int priority
    }

    affiliate_campaigns {
        char26 id PK
        char26 affiliate_config_id FK
        varchar campaign_id
        varchar campaign_name
        varchar refer_code
        timestamp start_date
        timestamp end_date
        boolean is_active
        boolean is_primary
        text notes
    }

    affiliate_link_clicks {
        char26 id PK
        char26 affiliate_config_id FK
        char26 campaign_id FK
        char26 product_id FK
        text generated_link
        varchar user_session
        boolean is_conversion
        decimal conversion_value
        timestamp clicked_at
    }

    ad_zones {
        char26 id PK
        varchar name
        varchar position
        jsonb dimensions
        jsonb configuration
        boolean is_active
    }

    advertisements {
        char26 id PK
        char26 zone_id FK
        varchar type
        text content_url
        text script_code
        text click_url
        jsonb targeting
        jsonb performance_data
        timestamp start_date
        timestamp end_date
        boolean is_active
    }

    gadget_brands {
        char26 id PK
        varchar name
        varchar slug UK
        text logo_url
        varchar country
        boolean is_active
        int sort_order
    }

    gadget_devices {
        char26 id PK
        char26 brand_id FK
        char26 product_id FK
        varchar name
        varchar slug UK
        varchar category
        text image_url
        text gsmarena_url
        boolean is_published
    }

    gadget_network {
        char26 product_id PK_FK
        text technology
        text bands_2g
        text bands_3g
        text bands_4g
        text bands_5g
        text speed
    }

    gadget_launch {
        char26 product_id PK_FK
        text announced
        text status
    }

    gadget_body {
        char26 product_id PK_FK
        text dimensions
        numeric weight_grams
        text build
        text sim
        text water_resistance
    }

    gadget_display {
        char26 product_id PK_FK
        text type
        numeric size_inches
        text resolution
        text protection
        text features
        int refresh_rate_hz
        int ppi
    }

    gadget_platform {
        char26 product_id PK_FK
        text os
        text chipset
        text cpu
        text gpu
    }

    gadget_memory {
        char26 product_id PK_FK
        text card_slot
        text internal
        int ram_gb
        int storage_min_gb
        text storage_type
    }

    gadget_main_camera {
        char26 product_id PK_FK
        text modules
        int megapixels_main
        text aperture_main
        text features
        text video
    }

    gadget_selfie_camera {
        char26 product_id PK_FK
        text modules
        int megapixels
        text features
        text video
    }

    gadget_sound {
        char26 product_id PK_FK
        text loudspeaker
        boolean has_stereo
        text jack_3_5mm
        boolean has_jack
    }

    gadget_comms {
        char26 product_id PK_FK
        text wlan
        text wifi_version
        text bluetooth
        numeric bt_version
        text positioning
        boolean has_nfc
        text radio
        text usb
        text usb_version
    }

    gadget_features {
        char26 product_id PK_FK
        text sensors
        text other
    }

    gadget_battery {
        char26 product_id PK_FK
        text type
        int capacity_mah
        text charging
        int charging_wired_w
        boolean has_wireless
        int wireless_w
        boolean has_reverse
    }

    gadget_misc {
        char26 product_id PK_FK
        text colors
        text models
        text sar_us
        text sar_eu
        text price_usd
    }

    gadget_tests {
        char26 product_id PK_FK
        text display_score
        text loudspeaker_lufs
        numeric battery_hours
    }

    search_logs {
        char26 id PK
        varchar query
        varchar category
        jsonb filters
        int results_count
        varchar user_session
    }

    user_interactions {
        char26 id PK
        varchar event_type
        text page_path
        char26 product_id FK
        text target_url
        jsonb metadata
        varchar user_session
        timestamp created_at
    }

    system_metrics {
        char26 id PK
        varchar metric_name
        decimal metric_value
        varchar unit
        jsonb metadata
        timestamp recorded_at
    }

    analytics_daily_aggregates {
        char26 id PK
        date aggregate_date
        varchar metric_type
        varchar dimension_key
        bigint metric_value
        jsonb metadata
    }
```

---

## Danh sách Tables (29 tables + 1 view)

### 1. Core — Sản phẩm & Giá

| Table | Mô tả | FK đi ra |
|-------|--------|----------|
| **categories** | Danh mục phân cấp (self-referencing tree) | `parent_id` → `categories.id` |
| **products** | Sản phẩm chính (điện thoại, laptop, gia dụng…) | — |
| **product_categories** | Junction table N:N giữa products ↔ categories | `product_id` → `products.id`, `category_id` → `categories.id` |
| **price_entries** | Giá từ các nguồn (Tiki, Shopee, Lazada…) | `product_id` → `products.id`, `affiliate_campaign_id` → `affiliate_campaigns.id` (nullable) |
| **price_sources** | Cấu hình nguồn giá (API / scrape) | — (standalone) |
| **vouchers** | Mã giảm giá các sàn TMĐT | — (standalone) |
| **website_config** | Cấu hình giao diện website (single-row) | — |

### 2. Affiliate & Quảng cáo

| Table | Mô tả | FK đi ra |
|-------|--------|----------|
| **affiliate_publishers** | Token/credentials cấp publisher (vd. AccessTrade app token dùng chung) | — |
| **affiliate_configs** | Cấu hình affiliate từng sàn hoặc domain | `publisher_id` → `affiliate_publishers.id` (nullable) |
| **affiliate_campaigns** | Chiến dịch affiliate (AT campaign ID, rotate) | `affiliate_config_id` → `affiliate_configs.id` |
| **affiliate_link_clicks** | Tracking click affiliate link | `affiliate_config_id` → `affiliate_configs.id`, `campaign_id` → `affiliate_campaigns.id`, `product_id` → `products.id` |
| **ad_zones** | Vùng quảng cáo trên website | — |
| **advertisements** | Quảng cáo cụ thể trong từng zone | `zone_id` → `ad_zones.id` |

#### Chú thích Affiliate & AccessTrade

**Luồng dữ liệu (seed → hiển thị):**

```
affiliate_publishers (app_token AT)
        │
        ▼
affiliate_configs (provider, domain_patterns, credentials)
        │
        ├── affiliate_campaigns (campaign_id AT, is_primary)
        │
        └── sinh link lúc seed ──► price_entries.affiliate_url
                                    + affiliate_campaign_id
                                    + affiliate_url_at
                                        │
                                        ▼
                              "Tới nơi bán" → /chuyen-huong
```

| Cột / bảng | Ý nghĩa |
|------------|---------|
| **affiliate_publishers** | Một hàng cho mỗi network (hiện tại: `provider = 'accesstrade'`). `app_token` là token API publisher — **không** lặp trong từng sàn. |
| **affiliate_configs.provider** | Cách sinh link: `native` (API riêng từng sàn), `accesstrade` (gọi AT `link_generate`), `manual` (ghép query theo `link_template`). |
| **affiliate_configs.publisher_id** | Khi `provider = 'accesstrade'`, lấy `app_token` từ publisher thay vì `credentials.appToken`. |
| **affiliate_configs.domain_patterns** | Mảng hostname/pattern để map URL sản phẩm → config (vd. `tiki.vn`, `cellphones.com.vn`). Bổ sung khi một sàn có nhiều domain hoặc sàn phụ qua AT. |
| **affiliate_configs.credentials** | JSONB credential **theo sàn** khi `provider = 'native'`: Tiki `{refCode}`, Shopee `{pubId, accessToken}`, TikTok `{appKey, accessToken}`, Lazada `{appToken, campaignId}`. Với AT, có thể để trống hoặc chỉ metadata phụ. |
| **affiliate_campaigns.campaign_id** | ID chiến dịch **bên AccessTrade** (external), không phải ULID nội bộ. |
| **affiliate_campaigns.is_primary** | Campaign đang dùng mặc định khi seed/regenerate. Partial unique index: tối đa **một** campaign `is_primary = true AND is_active = true` trên mỗi `affiliate_config_id`. |
| **price_entries.affiliate_url** | Snapshot link affiliate đã sinh — dùng trực tiếp trên UI, không gọi API lúc click. |
| **price_entries.affiliate_campaign_id** | FK tới campaign đã dùng khi sinh link — cho phép bulk regenerate khi đổi campaign. |
| **price_entries.affiliate_url_at** | Thời điểm sinh/cập nhật `affiliate_url` — audit & job refresh. |

**Rotate campaign:** Admin đặt campaign mới `is_primary = true` → job/API regenerate các `price_entries` có `affiliate_campaign_id` cũ → cập nhật `affiliate_url`, `affiliate_campaign_id`, `affiliate_url_at`.

### 3. Users & Content

| Table | Mô tả | FK đi ra |
|-------|--------|----------|
| **users** | Admin / Reviewer | — |
| **articles** | Bài viết review sản phẩm | `product_id` → `products.id`, `reviewer_id` → `users.id`, `created_by` → `users.id` |
| **article_versions** | Lịch sử phiên bản bài viết | `article_id` → `articles.id`, `edited_by` → `users.id` |

### 4. Gadget — Thông số thiết bị (GSMArena-style)

| Table | Mô tả | FK đi ra |
|-------|--------|----------|
| **gadget_brands** | Hãng sản xuất (Apple, Samsung…) | — |
| **gadget_devices** | Thiết bị crawl từ GSMArena | `brand_id` → `gadget_brands.id`, `product_id` → `products.id` |

14 bảng spec dưới đây quan hệ **1:1** với `products` (PK = FK = `product_id`):

| Table | Nội dung spec |
|-------|---------------|
| **gadget_network** | Băng tần 2G/3G/4G/5G, tốc độ |
| **gadget_launch** | Ngày công bố, trạng thái |
| **gadget_body** | Kích thước, trọng lượng, SIM, chống nước |
| **gadget_display** | Loại màn, kích thước, độ phân giải, tần số quét |
| **gadget_platform** | OS, chipset, CPU, GPU |
| **gadget_memory** | RAM, bộ nhớ trong, thẻ nhớ |
| **gadget_main_camera** | Camera chính, megapixel, video |
| **gadget_selfie_camera** | Camera selfie |
| **gadget_sound** | Loa, jack 3.5mm |
| **gadget_comms** | Wi-Fi, Bluetooth, NFC, USB, GPS |
| **gadget_features** | Cảm biến, tính năng đặc biệt |
| **gadget_battery** | Pin, sạc có dây/không dây |
| **gadget_misc** | Màu sắc, model, SAR, giá tham khảo |
| **gadget_tests** | Điểm benchmark màn hình, loa, pin |

### 5. Analytics & Logs

| Table | Mô tả | FK đi ra | Ghi chú |
|-------|--------|----------|---------|
| **search_logs** | Log tìm kiếm của user | — | |
| **user_interactions** | Tracking sự kiện (click, view…) | `product_id` → `products.id` | Partitioned by month |
| **system_metrics** | Metrics hệ thống | — | Partitioned by month |
| **analytics_daily_aggregates** | Dữ liệu tổng hợp theo ngày | — | |

### View

| View | Mô tả |
|------|--------|
| **product_gadget_specs** | JOIN 14 bảng spec vào `products` — dùng cho truy vấn nhanh, tránh dùng cho production vì 14 LEFT JOINs |

---

## Tóm tắt quan hệ khóa

```
products ─────┬──< price_entries          (product_id, affiliate_campaign_id)
              ├──< product_categories     (product_id)  >── categories
              ├──< articles               (product_id)
              ├──< affiliate_link_clicks  (product_id)
              ├──< user_interactions      (product_id)
              ├──< gadget_devices         (product_id)
              └──── 14 gadget spec tables (product_id, 1:1)

categories ───< categories               (parent_id, self-ref)

users ────────┬──< articles               (reviewer_id, created_by)
              └──< article_versions       (edited_by)

articles ─────< article_versions          (article_id)

affiliate_publishers ──< affiliate_configs (publisher_id)

affiliate_configs ─┬──< affiliate_campaigns    (affiliate_config_id)
                   └──< affiliate_link_clicks  (affiliate_config_id)

affiliate_campaigns ─┬──< affiliate_link_clicks  (campaign_id)
                     └──< price_entries          (affiliate_campaign_id)

ad_zones ─────< advertisements            (zone_id)

gadget_brands ─< gadget_devices            (brand_id)
```
