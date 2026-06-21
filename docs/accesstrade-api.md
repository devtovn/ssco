# AccessTrade Publisher API — Tài liệu tổng hợp

> Tổng hợp cách sử dụng API Publisher của AccessTrade (phiên bản tiếng Việt).
> Nguồn gốc: [developers.accesstrade.vn/api-publisher-vietnamese](https://developers.accesstrade.vn/api-publisher-vietnamese)
>
> 🔗 Mỗi phần bên dưới có link "Xem chi tiết tại AccessTrade" để mở trang tài liệu gốc tương ứng.

---

## 1. Tổng quan

- **Base URL:** `https://api.accesstrade.vn`
- **Định dạng dữ liệu:** JSON
- **Xác thực:** qua HTTP header `Authorization: Token <access_key>`
- **Access key lấy tại:** http://pub.accesstrade.vn/accounts/profile

📖 [Xem chi tiết tại AccessTrade — Authentication](https://developers.accesstrade.vn/api-publisher-vietnamese/authentication)

### Header bắt buộc cho mọi request

```
Authorization: Token <access_key>
Content-Type: application/json
```

> ⚠️ Lưu ý: header phải đúng định dạng `Token ` (chữ "Token", một dấu cách, rồi đến access_key). Phải truyền chính xác value.

### Ví dụ xác thực

```bash
curl --location 'https://api.accesstrade.vn/v1/transactions' \
  --header 'Authorization: Token bg1F-zURtCYDWH8KB79fLS5abjIyOg0G' \
  --header 'Content-Type: application/json'
```

---

## 2. Bảng tra nhanh các endpoint

| Chức năng | Method | Endpoint |
|-----------|--------|----------|
| Lấy danh sách campaigns | GET | `/v1/campaigns` |
| Lấy campaign (mới – cashback) | GET | `/v1/cashback/campaigns` |
| Tạo tracking link | POST | `/v1/product_link/create` |
| Lấy danh sách giao dịch (transactions) | GET | `/v1/transactions` |
| Lấy danh sách đơn hàng v2 | GET | `/v1/order-list` |
| Lấy thông tin sản phẩm của đơn hàng | GET | `/v1/order-products` |
| Lấy thông tin chi tiết sản phẩm | GET | `/v1/product_detail` |
| Lấy datafeeds (catalog sản phẩm) | GET | `/v1/datafeeds` |
| Lấy vouchers / coupons / deals | GET | `/v1/offers_informations` |
| Top sản phẩm bán chạy | GET | `/v1/top_products` |
| TikTok Shop – tìm sản phẩm v2 | GET | `/v2/tiktokshop_product_feeds` |
| TikTok Shop – tạo link v2 | POST | `/v2/tiktokshop_product_feeds/create_link` |

---

## 3. Campaigns

### 3.1 Lấy danh sách campaigns

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/lay-danh-sach-campaigns)

`GET https://api.accesstrade.vn/v1/campaigns`

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `approval` | Không | Lọc theo trạng thái duyệt; `approval=successful` để lấy campaign đã được duyệt |
| `campaign_id` | Không | Lọc theo ID campaign cụ thể |
| `limit` | Không | Số kết quả mỗi trang (vd: 20) |
| `page` | Không | Số trang (vd: 25) |

**Ví dụ:**

```bash
curl "https://api.accesstrade.vn/v1/campaigns?limit=20&page=25&approval=successful"
curl "https://api.accesstrade.vn/v1/campaigns?campaign_id=5504029976883264018"
```

**Các trường response chính:** `total`, `data[]` với mỗi campaign gồm `id`, `name`, `approval` (unregistered / pending / successful), `status` (1 = đang chạy), `merchant`, `cookie_duration` (giây), `description`, `start_time`, `end_time`, `category`, `type`, `url`.

### 3.2 Lấy campaign (NEW – commission/cashback)

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/api-get-campaign-new)

`GET https://api.accesstrade.vn/v1/cashback/campaigns?page=1&page_size=20`

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `page` | Int | Không | Số trang (mặc định 1) |
| `page_size` | Int | Không | Số phần tử mỗi trang |
| `category_id` | String | Không | ID danh mục |
| `sort_by` | String | Không | Sắp xếp theo `min_commission` hoặc `max_commission` |
| `sort_order` | String | Không | `asc` hoặc `desc` |
| `sort_by_category` | Bool | Không | Sắp xếp theo category (`true`/`false`) |

**Các trường response chính:** `campaign_id`, `min_commission`, `max_commission`, `commission_type` (`percentage`/`fixed`), `campaign_type`, `category_id`, `category_name`, `is_default`.

---

## 4. Tạo Tracking Link

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/tao-tracking-link)

`POST https://api.accesstrade.vn/v1/product_link/create`

Tham số gửi trong body JSON:

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `campaign_id` | Có | ID campaign |
| `urls` | Không | Danh sách link muốn tạo, cách nhau bởi dấu phẩy (mảng). Nếu bỏ trống dùng URL của campaign |
| `utm_source` | Không | Tham số tracking của publisher |
| `utm_medium` | Không | Tham số tracking |
| `utm_campaign` | Không | Tham số tracking |
| `utm_content` | Không | Tham số tracking |
| `sub1` … `sub4` | Không | Tham số tracking phụ |

**Ví dụ:**

```bash
curl --location 'https://api.accesstrade.vn/v1/product_link/create' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Token {your_token}' \
  --data '{
    "campaign_id": "4348614231480407268",
    "urls": ["https://shopee.vn/m/ma-giam-gia"],
    "utm_source": "test_source",
    "utm_medium": "test_medium",
    "utm_campaign": "test_campaign",
    "utm_content": "test_content",
    "sub1": "test_sub1",
    "sub2": "test_sub2",
    "sub3": "test_sub3"
  }'
```

**Response:**

```json
{
  "data": {
    "error_link": [],
    "success_link": [
      {
        "aff_link": "https://tracking.dev.accesstrade.me/deep_link/...",
        "first_link": null,
        "short_link": "https://shorten.dev.accesstrade.me/ujrBHxpc",
        "url_origin": "https://shopee.vn"
      }
    ],
    "suspend_url": []
  },
  "success": true
}
```

---

## 5. Giao dịch (Transactions)

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/lay-danh-sach-giao-dich)

`GET https://api.accesstrade.vn/v1/transactions`

> ⏱️ Rate limit: **10 requests / 1 phút**

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `since` | Có | Thời gian bắt đầu theo sale time, ISO format. VD: `2016-08-01T00:00:00Z` |
| `until` | Có | Thời gian kết thúc theo sale time, ISO format. VD: `2016-08-02T00:00:00Z` |
| `page` | Không | Số trang (mặc định None) |
| `offset` | Không | Mặc định 0 |
| `limit` | Không | Số kết quả mỗi request (mặc định 100) |
| `merchant` | Không | Tên merchant (vd: tikivn) |
| `utm_source` / `utm_campaign` / `utm_medium` / `utm_content` | Không | Lọc theo tham số UTM |
| `status` | Không | 0 = hold, 1 = approved, 2 = rejected |
| `is_confirmed` | Không | 0 = chờ duyệt, 1 = đã duyệt |
| `transaction_id` | Không | Một hoặc nhiều ID (cách nhau bởi dấu phẩy) |
| `update_time_start` / `update_time_end` | Không | Khoảng thời gian update (ISO format) |
| `is_brand_bonus` | Không | `true`/`false` |

**Ví dụ:**

```bash
curl --location 'https://api.accesstrade.vn/v1/transactions?until=2023-03-03T16%3A00%3A00Z&since=2023-01-03T15%3A00%3A00Z&limit=2' \
  --header 'Authorization: Token <access_key>' \
  --header 'Content-Type: application/json'
```

**Trường response chính:** `total`, `data.status`, `data.transaction_id`, `data.transaction_value`, `data.commission`, `data.product_id`, `data.is_confirmed`, `data.confirmed_time`, `data.is_brand_bonus`.

---

## 6. Đơn hàng v2 (Order List)

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/lay-danh-sach-don-hang-v2)

`GET https://api.accesstrade.vn/v1/order-list`

> ⏱️ Rate limit: 10 requests/phút. Kết quả được cache 1 phút.

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `since` | Có | Thời gian bắt đầu, ISO format |
| `until` | Có | Thời gian kết thúc, ISO format |
| `page` | Không | Số trang, bắt đầu từ 1 (mặc định 1) |
| `limit` | Không | Số đơn mỗi trang, tối đa 300 (mặc định 30) |
| `status` | Không | 0 = Pending, 1 = Approved, 2 = Rejected |
| `merchant` | Không | Tên merchant (vd: adayroi, lazada) |
| `utm_source` / `utm_campaign` / `utm_medium` / `utm_content` | Không | Lọc theo UTM |

**Ví dụ:**

```
https://api.accesstrade.vn/v1/order-list?since=2021-01-01T00:00:00Z&until=2021-01-10T00:00:00Z
```

**Trường response chính:** `total`, `data[]` với `order_id`, `billing`, `sales_time`, `merchant`, `pub_commission`, trạng thái (`order_pending`, `order_reject`, `order_approved`), UTM, `product_category`, `click_time`, `confirmed_time`, `update_time`.

---

## 7. Sản phẩm của đơn hàng (Order Products)

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/lay-thong-tin-san-pham-cua-don-hang)

`GET https://api.accesstrade.vn/v1/order-products`

> ⏱️ Rate limit: 10 requests/phút

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `order_id` | Có | Order_id của đơn hàng (lấy từ API order v2) |
| `merchant` | Có | Tên merchant (vd: adayroi, lazada) |
| `page` | Không | Số trang, bắt đầu từ 1 (mặc định 1) |
| `limit` | Không | Số đơn trả về mỗi trang |

**Ví dụ:**

```
https://api.accesstrade.vn/v1/order-products?order_id=6357878818&merchant=shopee_kolnew
```

**Trường response chính:** `data._at`, `data._extra`, `data.billing` (approved/pending/reject), `data.commission` (approved/pending/reject), `data.click_time`, `data.confirmed_time`, `data.product_price`, `data.product_quantity`, `data.reason_rejected`, `data.sales_time`, `total`.

---

## 8. Chi tiết sản phẩm (Product Detail)

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/lay-thong-tin-chi-tiet-san-pham)

`GET https://api.accesstrade.vn/v1/product_detail`

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `merchant` | Có | VD: adayroi, lazada |
| `product_id` | Có | ID sản phẩm |
| `transaction_id` | Có | Mã giao dịch |

**Ví dụ:**

```
https://api.accesstrade.vn/v1/product_detail?merchant=fpt_longchau&product_id=00033675--80799010-N-1&transaction_id=80799016941733898708944
```

**Trường response chính:** `name`, `price`, `short_desc`, `discount`, `link`, `image`, `desc`, `category_id`, `brand`, `shop_name`, `shop_id`, `category_name`.

---

## 9. Datafeeds (Catalog sản phẩm)

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/lay-thong-tin-datafeeds)

`GET https://api.accesstrade.vn/v1/datafeeds`

| Tham số | Mô tả |
|---------|-------|
| `campaign` | Merchant của owner sản phẩm (vd: lazada) |
| `domain` | Domain của owner sản phẩm (vd: lazada.vn) |
| `discount_amount_from` / `discount_amount_to` | Lọc theo số tiền giảm |
| `discount_rate_from` / `discount_rate_to` | Lọc theo % giảm |
| `price_from` / `price_to` | Lọc theo giá gốc |
| `discount_from` / `discount_to` | Lọc theo giá khuyến mại |
| `status_discount` | 0 = không khuyến mại, 1 = có khuyến mại |
| `update_from` / `update_to` | Lọc theo thời gian update datafeed (vd: 08-09-2017) |
| `page` | Số trang, max = total/limit (mặc định 1) |
| `limit` | Số sản phẩm cần lấy (mặc định 50, max 200) |

**Ví dụ:**

```
https://api.accesstrade.vn/v1/datafeeds?domain=lazada.vn&sku=AN273FAAA1FXLXVNAMZ-2293380
```

**Trường response chính:** `data[]` với `aff_link`, `campaign`, `cate`, `desc`, `discount`, `discount_amount`, `discount_rate`, `domain`, `image`, `merchant`, `name`, `price`, `product_id`, `promotion`, `sku`, `status_discount`, `update_time`, `url`; cùng `total`.

---

## 10. Vouchers / Coupons / Deals

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/lay-thong-tin-vouchers-coupons-deals)

`GET https://api.accesstrade.vn/v1/offers_informations`

| Tham số | Mô tả |
|---------|-------|
| `scope` | `expiring` để lấy khuyến mãi sắp hết hạn |
| `merchant` | Đơn vị phát hành khuyến mãi |
| `categories` | Danh mục khuyến mãi, cách nhau bởi dấu phẩy |
| `domain` | Domain khuyến mãi (vd: lazada.vn) |
| `coupon` | 1 = có mã coupon, 0 = không (mặc định: tất cả) |
| `status` | 1 = đang hoạt động, 0 = hết hạn (trống = tất cả) |
| `limit` | Số khuyến mãi mỗi trang |
| `page` | Số trang |

**Ví dụ:**

```
https://api.accesstrade.vn/v1/offers_informations?merchant=bambooairways
```

**Trường response chính:** `data[]` với `id`, `name`, `merchant`, `domain`, `start_time`, `end_time`, `link`, `image`, `content`, `categories`, `banners` (`link`, `width`, `height`), `aff_link`, `coupons[]`.

---

## 11. Top sản phẩm bán chạy

📖 [Xem chi tiết tại AccessTrade](https://developers.accesstrade.vn/api-publisher-vietnamese/top-cac-san-pham-ban-chay-nhat)

`GET https://api.accesstrade.vn/v1/top_products`

> Trả về tối đa 50 sản phẩm bán chạy mỗi request.

| Tham số | Bắt buộc | Mô tả |
|---------|----------|-------|
| `date_from` | Không | Ngày bắt đầu, format `DD-MM-YYYY` (vd: 01-04-2016) |
| `date_to` | Không | Ngày kết thúc, format `DD-MM-YYYY` |
| `merchant` | Không | Tên merchant (vd: lazada) |

**Ví dụ:**

```
https://api.accesstrade.vn/v1/top_products?date_from=01-07-2020&date_to=20-07-2020
```

**Trường response chính:** `aff_link`, `brand`, `category_id`, `category_name`, `desc`, `discount`, `image`, `link`, `name`, `price`, `product_category`, `product_id`, `short_desc`, `total`.

---

## 12. TikTok Shop (v2)

📖 [Xem chi tiết tại AccessTrade — TikTok Shop](https://developers.accesstrade.vn/api-publisher-vietnamese/tich-hop-api-publisher-at-cho-chien-dich-tiktok-shop)

### 12.1 Tìm kiếm sản phẩm

📖 [Product Search v2](https://developers.accesstrade.vn/api-publisher-vietnamese/tich-hop-api-publisher-at-cho-chien-dich-tiktok-shop/version-2-updated-version/tiktok-product-search-v2)

`GET https://api.accesstrade.vn/v2/tiktokshop_product_feeds`

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `sort_field` | string | Có | `RECOMMENDED`, `BEST_SELLERS`, `LOW_PRICE`, `HIGH_PRICE`, `NEWLY_RELEASED`, `HIGH_COMMISSION_RATE` |
| `limit` | integer | Có | Số kết quả trả về |
| `title_keywords` | string | Có | Lọc theo từ khóa tiêu đề |
| `page_token` | string | Không | Token phân trang (trả về qua `next_page_token`) |
| `product_ids` | string | Không | ID sản phẩm cụ thể |

**Ví dụ:**

```
GET https://api.accesstrade.vn/v2/tiktokshop_product_feeds?sort_field=RECOMMENDED&limit=10&title_keywords=tr%E1%BA%BB%20em&page_token=b2Zmc2V0PTEw
Authorization: Token <access_key>
Content-Type: application/json
```

**Trường response chính:** `data.products[]` (`id`, `title`, `main_image_url`, `detail_link`, `units_sold`, `has_inventory`, `sale_region`, `shop.name`, `commission`, `original_price`, `sales_price`, `category_chains[]`), `data.next_page_token`, `data.total_count`, `status`.

### 12.2 Tạo link

📖 [Create Link v2](https://developers.accesstrade.vn/api-publisher-vietnamese/tich-hop-api-publisher-at-cho-chien-dich-tiktok-shop/version-2-updated-version/create-link-v2)

`POST https://api.accesstrade.vn/v2/tiktokshop_product_feeds/create_link`

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `product_url` | string | Có | URL sản phẩm |
| `product_id` | string | Không | ID sản phẩm |
| `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` | string | Không | Tham số tracking |
| `sub_1` … `sub_4` | string | Không | Tham số tracking phụ |

**Query param tùy chọn:** `minify=true` — chỉ trả về link affiliate, bỏ qua chi tiết sản phẩm.

**Response (status 200):** `status` (bool), `message`, `data` gồm `aff_short_url`, `aff_url`, và tùy chọn `product_id`, `product_name`, `product_image`, `product_price`, `product_commission`.

> Phiên bản v1 cũng tồn tại tại các endpoint tương ứng dưới `/v1/...` nhưng v2 là bản cập nhật, khuyến nghị dùng v2.

---

## 13. Mã lỗi (Error codes)

📖 [Xem chi tiết tại AccessTrade — Errors](https://developers.accesstrade.vn/api-publisher-vietnamese/errors)

| Mã | Ý nghĩa |
|----|---------|
| 400 | Bad Request – Request không hợp lệ |
| 401 | Unauthorized – API key sai |
| 403 | Forbidden – Tài nguyên chỉ dành cho admin |
| 404 | Not Found – Không tìm thấy API |
| 405 | Method Not Allowed – Sai HTTP method |

---

## 14. Ghi chú khi tích hợp

- Mọi request đều cần header `Authorization: Token <access_key>` và `Content-Type: application/json`.
- Các API report (transactions, order-list, order-products) giới hạn **10 requests/phút** — cần throttle khi đồng bộ dữ liệu lớn.
- Thời gian dùng định dạng ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`) cho transactions/orders, nhưng `DD-MM-YYYY` cho `top_products` và `datafeeds`. Lưu ý khác biệt.
- Khi gọi GET, nhớ URL-encode các giá trị (vd: `:` → `%3A`, dấu cách → `%20`).
- Có thể đọc bản markdown của bất kỳ trang tài liệu nào bằng cách thêm `.md` vào URL.
