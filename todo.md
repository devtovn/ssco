# Affiliate & AccessTrade — TODO

> Cập nhật trạng thái khi hoàn thành từng mục.

## Schema & types (xong)

- [x] Cập nhật `structure-tables.md` + chú thích ER
- [x] Migration `1748800000000_affiliate-accesstrade-schema.ts`
- [x] Đồng bộ `@kombe/types` + Zod schemas
- [x] Mở rộng `AffiliateLinkService` mapping (publisher, campaign, config)

## Implementation

- [x] **1.** Ghi `affiliate_campaign_id` + `affiliate_url_at` lúc seed (`generate-affiliate` → save → `price_entries`)
- [x] **2.** Sinh link qua AccessTrade all-platform (`provider=accesstrade`, token publisher + campaign primary)
- [x] **3.** API bulk regenerate `affiliate_url` khi đổi / rotate campaign (`POST /api/affiliate/regenerate`)
- [x] **4.** Admin UI: publisher token AccessTrade + quản lý campaign / đặt primary / nút regenerate

## Việc tiếp theo (ngoài scope hiện tại)

- [x] Chạy migration trên DB Docker: `cd backend && npm run migrate up`
- [ ] E2E test: seed sản phẩm với provider AccessTrade + verify link redirect
- [ ] Mở rộng `platformId` enum seed cho sàn phụ qua AT (ngoài tiki/shopee/tiktok/lazada)
