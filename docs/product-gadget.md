# Product ↔ Gadget Integration

> Tài liệu này mô tả yêu cầu, kiến trúc và luồng vận hành của module **So sánh Thiết bị** và cách liên kết với module **So sánh Giá** hiện có.

---

## 1. Bối cảnh & Mục tiêu

Website `sosanh.site` có hai chức năng chính:

| Tab | Mô tả | URL |
|-----|-------|-----|
| **So sánh Giá** | So sánh giá sản phẩm từ Tiki, Shopee, Lazada, TikTok | `/` (trang chủ) |
| **So sánh Thiết bị** | Tra cứu & so sánh thông số kỹ thuật (specs) từ GSMArena | `/gadget/` |

Hai module được **liên kết qua FK `gadget_devices.product_id → products.id`** để:
- Từ trang specs gadget → xem giá bán trên các sàn
- Từ trang sản phẩm → xem thông số kỹ thuật đầy đủ

---

## 2. Database Schema

### 2.1 Bảng mới

```sql
-- Hãng sản xuất
gadget_brands (
  id UUID PK,
  name VARCHAR(100),
  slug VARCHAR(100) UNIQUE,
  logo_url TEXT,
  description TEXT,
  country VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
)

-- Thiết bị (mobile / tablet / smartwatch)
gadget_devices (
  id UUID PK,
  brand_id UUID FK → gadget_brands(id),
  name VARCHAR(200),
  slug VARCHAR(200) UNIQUE,
  category VARCHAR(50),         -- 'mobile' | 'tablet' | 'smartwatch'
  image_url TEXT,
  gsmarena_url TEXT,            -- URL nguồn crawl
  announced VARCHAR(100),
  released VARCHAR(100),
  status VARCHAR(100),
  specs JSONB,                  -- toàn bộ thông số kỹ thuật
  is_published BOOLEAN DEFAULT false,
  product_id UUID FK → products(id) ON DELETE SET NULL  -- liên kết giá
)
```

### 2.2 Cấu trúc JSONB `specs`

Mỗi key là một nhóm thông số, value là `Record<string, string>`:

```json
{
  "network":       { "technology": "GSM / HSPA / LTE / 5G", ... },
  "launch":        { "announced": "2025, September", "status": "Available" },
  "body":          { "dimensions": "163.0 x 77.6 x 8.3 mm", "weight": "218 g", ... },
  "display":       { "type": "LTPO OLED", "size": "6.9 inches", ... },
  "platform":      { "os": "iOS 18", "chipset": "Apple A19 Pro", "cpu": "...", "gpu": "..." },
  "memory":        { "card_slot": "No", "internal": "256GB 8GB RAM" },
  "main_camera":   { "specs": "48 MP + 48 MP + 12 MP", "video": "4K@60fps" },
  "selfie_camera": { "specs": "24 MP", "video": "4K@60fps" },
  "sound":         { "loudspeaker": "Yes", "3_5mm_jack": "No" },
  "comms":         { "wlan": "Wi-Fi 7", "bluetooth": "5.3", "nfc": "Yes", "usb": "USB-C 4.0" },
  "features":      { "sensors": "Face ID, barometer, ..." },
  "battery":       { "type": "Li-Ion", "capacity": "4685 mAh", "charging": "30W wired" },
  "misc":          { "colors": "Black Titanium, ...", "price": "From $1199" }
}
```

### 2.3 Bảng hiện có được mở rộng

```sql
-- price_entries: thêm cột affiliate_url
affiliate_url TEXT DEFAULT NULL   -- link affiliate pre-generated lúc seed

-- affiliate_configs: thêm cột credentials
credentials JSONB DEFAULT NULL    -- API keys per platform (pub_id, access_token, ...)
```

---

## 3. Migration Files

Chạy theo thứ tự:

```powershell
# 1. Thêm affiliate_url vào price_entries
Get-Content scripts\add-affiliate-url.sql | docker exec -i kombe-postgres psql -U kombe -d kombe

# 2. Thêm credentials vào affiliate_configs
Get-Content scripts\add-affiliate-credentials.sql | docker exec -i kombe-postgres psql -U kombe -d kombe

# 3. Tạo bảng gadget_brands + gadget_devices (seed 15 hãng)
Get-Content scripts\add-gadget-tables.sql | docker exec -i kombe-postgres psql -U kombe -d kombe

# 4. Thêm product_id FK vào gadget_devices
Get-Content scripts\add-gadget-product-link.sql | docker exec -i kombe-postgres psql -U kombe -d kombe
```

---

## 4. Backend API

### 4.1 Public Gadget API (`/api/gadget/...`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/gadget/brands` | Danh sách hãng (active, kèm device_count) |
| GET | `/gadget/brands/:slug/devices` | Thiết bị theo hãng (filter by category, page) |
| GET | `/gadget/devices/:slug` | Chi tiết thiết bị + full specs |
| GET | `/gadget/devices/:slug/prices` | Giá bán từ `price_entries` qua linked product |
| GET | `/gadget/by-product/:productSlug` | Gadget specs cho trang chi tiết sản phẩm |
| GET | `/gadget/compare?slugs=s1,s2,s3` | So sánh 2–4 thiết bị (max 4) |
| GET | `/gadget/search?q=&category=&brand=` | Tìm kiếm thiết bị |

### 4.2 Admin Gadget API (`/api/admin/gadget/...`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/admin/gadget/search` | Tìm kiếm keyword trên GSMArena, trả về danh sách link |
| POST | `/admin/gadget/crawl` | Crawl specs từ GSMArena URL |
| POST | `/admin/gadget/devices` | Lưu thiết bị (draft, auto-publish theo config) |
| GET | `/admin/gadget/devices` | Danh sách tất cả (kể cả unpublished) |
| PUT | `/admin/gadget/devices/:id` | Cập nhật specs hoặc trạng thái |
| POST | `/admin/gadget/devices/:id/publish` | Publish / Unpublish |
| POST | `/admin/gadget/devices/:id/link-product` | Liên kết gadget ↔ product |
| DELETE | `/admin/gadget/devices/:id` | Xoá thiết bị |
| PUT | `/admin/gadget/brands/:id` | Cập nhật logo, thông tin hãng |

---

## 5. Luồng Seed Thiết bị (Admin)

```
Admin vào /admin/gadget
    │
    ├── Chế độ Từ khóa:
    │   └── Nhập keyword (vd: "iPhone 17 Pro Max")
    │       → POST /admin/gadget/search
    │       → GSMArena trả về danh sách link kèm tên + ảnh
    │       → Admin chọn 1 kết quả
    │       → POST /admin/gadget/crawl { url }
    │       → Preview specs (N nhóm, M thông số)
    │
    └── Chế độ URL trực tiếp:
        └── Dán link GSMArena (vd: gsmarena.com/apple_iphone_17_pro_max-13964.php)
            → POST /admin/gadget/crawl { url }
            → Preview specs

Admin chọn hãng → POST /admin/gadget/devices { brandId, specs, ... }
    │
    ├── Nếu cấu hình "Auto-publish" = ON  → isPublished = true  → Hiện trên /gadget/
    └── Nếu "Auto-publish" = OFF           → isPublished = false → Draft, cần publish thủ công

Admin liên kết sản phẩm:
    → Trong danh sách thiết bị, click "Liên kết sản phẩm"
    → Tìm kiếm sản phẩm trong DB theo tên
    → POST /admin/gadget/devices/:id/link-product { productId }
    → gadget_devices.product_id = products.id ✓
```

---

## 6. Luồng Người Dùng

### 6.1 Tra cứu specs & mua hàng

```
/gadget/                         Chọn hãng (grid logo)
    ↓
/gadget/:brand                   Danh sách thiết bị theo hãng (filter mobile/tablet/watch)
    ↓
/gadget/:brand/:device           Chi tiết specs:
    ├── Hero: ảnh + tên + quick specs (màn hình, chipset, camera, pin, RAM, OS)
    ├── [⚖️ So sánh thiết bị này] → /gadget/compare?slugs=slug
    ├── Giá trên các sàn (GadgetPricePanel):
    │   └── mỗi sàn 1 dòng: tên sàn | giá | [So sánh giá] [Tới nơi bán →]
    └── Bảng thông số đầy đủ (SpecsTable, format GSMArena)
```

### 6.2 So sánh 2–4 thiết bị

```
/gadget/compare?slugs=s1,s2,s3
    ├── Tìm kiếm thêm thiết bị (autocomplete)
    ├── CompareTable (specs side-by-side, tất cả nhóm)
    └── Giá trên các sàn (mỗi thiết bị 1 block, cùng format)
```

### 6.3 Từ trang sản phẩm → xem specs

```
/san-pham/:slug
    ├── Tab "So sánh giá"       → PriceComparisonTable (hiện tại)
    └── Tab "Thông số kỹ thuật" → SpecsTable (từ gadget liên kết)
                                  + link "Xem trang cấu hình đầy đủ →"
```

---

## 7. Component Map

```
components/gadget/
├── SpecsTable.tsx       Bảng specs 1 thiết bị (dùng ở detail + product tab)
├── CompareTable.tsx     Bảng so sánh side-by-side 2–4 thiết bị
└── GadgetPricePanel.tsx Panel giá trên các sàn (fetch /gadget/devices/:slug/prices)
                         Mỗi dòng: [So sánh giá] → /san-pham/:slug
                                   [Tới nơi bán] → /chuyen-huong?... (flow giống product detail)

app/gadget/
├── page.tsx             Brand listing
├── [brand]/page.tsx     Device listing theo hãng
├── [brand]/[device]/page.tsx   Device detail + GadgetPricePanel + SpecsTable
└── compare/page.tsx     Comparison page + GadgetPricePanel per device

components/product/
├── ProductDetailTabs.tsx  Thêm props: gadgetSpecs?, gadgetSlug?
│                          Tab "Thông số kỹ thuật" render SpecsTable nếu có data
└── ProductTabsSection.tsx Pass-through gadgetSpecs, gadgetSlug
```

---

## 8. Affiliate Link Flow (price_entries)

```
Lúc SEED:
  Admin dán affiliate URL (hoặc click ⚡ Tạo link)
  → Backend gọi API sàn (Tiki: auto ?ref=CODE, Shopee/Lazada/TikTok: API call)
  → Lưu affiliate_url vào price_entries

Lúc USER CLICK "Tới nơi bán":
  PriceComparisonTable / GadgetPricePanel đọc entry.affiliateUrl || entry.sourceUrl
  → /chuyen-huong?to={url}&source={platform}&pid={productId}&name={name}
  → 5s countdown → redirect (không có API call runtime)
```

### Credentials per platform (lưu trong `affiliate_configs.credentials`):

| Sàn | Fields | Cách lấy |
|-----|--------|----------|
| Tiki | `refCode` | affiliate.tiki.vn → Mã giới thiệu |
| Shopee | `pubId`, `accessToken` | affiliate.shopee.vn → Open Platform |
| Lazada | `appToken`, `campaignId` | accesstrade.vn → Lazada campaign |
| TikTok Shop | `appKey`, `accessToken` | affiliate.tiktokshop.com → Open Platform |

---

## 9. Cấu hình (Admin → Cấu hình)

| Setting | Key trong `website_config.metadata` | Mô tả |
|---------|--------------------------------------|-------|
| Auto-publish gadget | `gadget_auto_publish: boolean` | `true` → publish ngay sau crawl; `false` → Draft, cần publish thủ công |

---

## 10. Dependencies cần cài

```bash
# Backend: HTML parser cho GSMArena crawler
docker exec kombe-backend npm install cheerio
```

---

## 11. Checklist Deploy

- [ ] Chạy 4 migration SQL (theo thứ tự mục 3)
- [ ] `docker exec kombe-backend npm install cheerio`
- [ ] Vào `/admin/gadget` → seed thiết bị đầu tiên
- [ ] Vào `/admin/affiliate` → nhập credentials từng sàn
- [ ] Vào `/admin/config` → bật/tắt Auto-publish theo nhu cầu
- [ ] Liên kết gadget ↔ product: trong danh sách thiết bị, click "Liên kết sản phẩm"
- [ ] Verify: `/gadget/` hiển thị brands → click hãng → xem device → xem prices panel
- [ ] Verify: `/san-pham/:slug` tab "Thông số kỹ thuật" có data (nếu đã liên kết)
