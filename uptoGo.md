# Refactor Backend: Node.js → Go

## Stack quyết định

| Vai trò | Node.js (cũ) | Go (mới) |
|---|---|---|
| Framework | Express | **Gin** |
| DB Driver | pg | **pgx/v5** |
| Redis | redis/v4 | **go-redis/v9** |
| JWT | jsonwebtoken | **golang-jwt/jwt/v5** |
| Password | bcrypt | **golang.org/x/crypto/bcrypt** |
| Validation | zod | **go-playground/validator/v10** |
| Cron/Queue | Bull + Redis | **robfig/cron/v3** |
| HTTP Client | axios | **net/http** (stdlib) |
| HTML Scraping | cheerio | **PuerkitoBio/goquery** |
| Swagger | swagger-jsdoc | **swaggo/swag** |
| Logger | morgan + console | **log/slog** (stdlib Go 1.21+) |
| Migrations | node-pg-migrate | **pressly/goose/v3** |
| Config | dotenv | **godotenv** |
| Test | jest | **testing** + **testify** |

## Cấu trúc thư mục Go

```
backend/
  cmd/server/main.go          ← entrypoint
  internal/
    config/                   ← env, db pool, redis
    handler/                  ← HTTP handlers (= routes hiện tại)
    service/                  ← business logic (= services hiện tại)
    repository/               ← raw DB queries
    middleware/               ← auth, rate limiter, error handler
    model/                    ← domain structs (= TypeScript types)
    cache/                    ← cache utilities + CacheService
    queue/                    ← cron jobs (= DataCollectionQueue)
    crawler/                  ← GadgetCrawlerService
  migrations/                 ← giữ nguyên SQL, thêm goose wrapper
  Dockerfile
  go.mod
  go.sum
```

---

## Tasks

### PHASE 0 — Setup

- [x] DONE **0.1** Khởi tạo `go.mod`, cài dependencies, folder structure
- [x] DONE **0.2** Port `Dockerfile` và `docker-compose.yml` cho Go binary
- [x] DONE **0.3** Setup `internal/config`: đọc env, khởi tạo DB pool (pgx), Redis client (go-redis)
- [x] DONE **0.4** Setup migration runner bằng `pressly/goose` — giữ nguyên SQL migrations hiện có

### PHASE 1 — Core Infrastructure

- [x] DONE **1.1** `internal/model`: port tất cả TypeScript types → Go structs (`Product`, `PriceEntry`, `Category`, `User`, `SearchQuery`, `SearchResponse`, `Deal`, `PriceHistory`, `Affiliate`, `Advertisement`, `Analytics`, `Content`, `Gadget`, `Voucher`)
- [x] DONE **1.2** `internal/cache`: port `CacheService` (get/set/delete/deletePattern với SCAN/setMultiple) + `CacheKeys` + `CacheTTL`
- [x] DONE **1.3** `internal/middleware/logger`: request logging (thay morgan)
- [x] DONE **1.4** `internal/middleware/error`: error handler, `AppError`, các custom error types
- [x] DONE **1.5** `internal/middleware/metrics`: request metrics snapshot (thay metrics.ts)
- [x] DONE **1.6** `internal/middleware/auth`: JWT verify middleware, `requireRole`
- [x] DONE **1.7** `internal/middleware/ratelimiter`: Redis-backed rate limiter (INCR+EXPIRE pattern)
- [x] DONE **1.8** `cmd/server/main.go`: Gin engine, đăng ký middleware, graceful shutdown

### PHASE 2 — Authentication

- [x] DONE **2.1** `internal/service/auth`: `AuthenticationService` — bcrypt hash/verify, JWT sign/verify (access + refresh token), token rotation
- [x] DONE **2.2** `internal/handler/auth`: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/change-password`

### PHASE 3 — Categories

- [x] DONE **3.1** `internal/repository/category`: DB queries — tree, by slug, by id, products in category, metrics
- [x] DONE **3.2** `internal/service/category`: `CategoryManagementService` — CRUD, tree builder, slug
- [x] DONE **3.3** `internal/service/cachedcategory`: wrap với Redis cache (TTL từ `CacheTTL`)
- [x] DONE **3.4** `internal/handler/categories`: 9 endpoints (GET tree, GET /:slug, GET /:id/products, POST, PUT, DELETE, v.v.)

### PHASE 4 — Search

- [x] DONE **4.1** `internal/repository/search`: full-text search queries (PostgreSQL `tsvector`/`tsquery`), suggestions, popular keywords, track search
- [x] DONE **4.2** `internal/service/search`: `SearchService` — pagination, filter, sort
- [x] DONE **4.3** `internal/service/cachedsearch`: wrap cache (5 phút search results, 10 phút suggestions)
- [x] DONE **4.4** `internal/handler/search`: `GET /search`, `GET /search/suggestions`, `GET /search/popular`

### PHASE 5 — Products & Prices

- [x] DONE **5.1** `internal/repository/price`: queries — get prices by product, price history, best deals, upsert price entry, materialized view `cheapest_prices`
- [x] DONE **5.2** `internal/service/price`: `PriceComparisonService` — get prices, history, deals, statistics, update prices
- [x] DONE **5.3** `internal/service/cachedprice`: wrap cache (1 giờ prices, 2 giờ history, 30 phút deals)
- [x] DONE **5.4** `internal/handler/prices`: `GET /products/:id/prices`, `GET /products/:id/price-history`, `GET /deals`, `PUT /products/:id/prices`

### PHASE 6 — Admin

- [x] DONE **6.1** `internal/repository/admin`: queries — user management, system config, website config, dashboard stats
- [x] DONE **6.2** `internal/service/admin`: `AdminService` — user CRUD, config management, dashboard
- [x] DONE **6.3** `internal/handler/admin`: tất cả `/admin/*` endpoints (~30 endpoints trong admin.ts)

### PHASE 7 — Affiliate

- [x] DONE **7.1** `internal/repository/affiliate`: queries — configs, campaigns, performance, link generation
- [x] DONE **7.2** `internal/service/affiliate`: `AffiliateLinkService` + `PlatformAffiliateService` — build affiliate URLs, track clicks
- [x] DONE **7.3** `internal/service/cachedaffiliate`: wrap cache
- [x] DONE **7.4** `internal/handler/affiliate`: tất cả `/affiliate/*` endpoints (~8 endpoints)

### PHASE 8 — Advertisements

- [x] DONE **8.1** `internal/repository/ads`: queries — zones, active ads, performance metrics, impressions/clicks
- [x] DONE **8.2** `internal/service/ads`: `AdvertisementService` — CRUD zones, rotation, performance tracking
- [x] DONE **8.3** `internal/service/cachedads`: wrap cache (10 phút zones, 5 phút performance)
- [x] DONE **8.4** `internal/handler/ads`: tất cả `/ads/*` endpoints (~20 endpoints trong ads.ts)

### PHASE 9 — Analytics

- [x] DONE **9.1** `internal/repository/analytics`: queries — user interactions, page views, product views, system metrics
- [x] DONE **9.2** `internal/service/analytics`: `AnalyticsService` — track events, aggregate stats, export
- [x] DONE **9.3** `internal/handler/analytics`: tất cả `/analytics/*` endpoints (~8 endpoints)

### PHASE 10 — Content

- [x] DONE **10.1** `internal/repository/content`: queries — articles, article versions, CMS
- [x] DONE **10.2** `internal/service/content`: `ContentManagementService` — CRUD articles, versioning, publish/unpublish
- [x] DONE **10.3** `internal/handler/content`: tất cả `/content/*` endpoints (~7 endpoints)

### PHASE 11 — Gadget

- [x] DONE **11.1** `internal/crawler/gadget`: port `GadgetCrawlerService` — HTTP + goquery để parse GSMArena (thay cheerio+axios)
- [x] DONE **11.2** `internal/repository/gadget`: queries — gadget specs, gadget products, brand logos
- [x] DONE **11.3** `internal/service/gadget`: `GadgetService` — CRUD, specs enrichment, AI description
- [x] DONE **11.4** `internal/handler/gadget`: `/gadget/*` và `/admin/gadget/*` endpoints (~10 endpoints)

### PHASE 12 — Vouchers

- [x] DONE **12.1** `internal/repository/voucher`: queries — voucher CRUD, validate, track usage
- [x] DONE **12.2** `internal/service/voucher`: voucher logic
- [x] DONE **12.3** `internal/handler/vouchers`: `/vouchers/*` endpoints (~5 endpoints)

### PHASE 13 — Public Routes

- [x] DONE **13.1** `internal/handler/public`: `/public/*` endpoints — website config, homepage data

### PHASE 14 — Seed (Admin Tool)

- [x] DONE **14.1** `internal/service/platformapi`: port `PlatformAPIService` — Tiki/Shopee no-key API calls với `net/http`, timeout 8s
- [x] DONE **14.2** `internal/service/apiintegrator`: port `APIIntegratorService` — key rotation, exponential backoff, rate limiter
- [x] DONE **14.3** `internal/handler/seed`: `/admin/seed/*` endpoints — preview URL, preview keyword, save product, refresh prices

### PHASE 15 — Data Collection (Background Jobs)

- [x] DONE **15.1** `internal/queue/collector`: port `DataCollectionService.collectFromAPIs` + `refreshAllProductPrices`
- [x] DONE **15.2** `internal/queue/cron`: setup `robfig/cron` — thay Bull, cron `0 */6 * * *` cho full collection

### PHASE 16 — SEO

- [x] DONE **16.1** `internal/service/seo`: port `SEOOptimizer` — generate meta tags, sitemap helpers

### PHASE 17 — AI Service

- [x] DONE **17.1** `internal/service/ai`: port `AIService` — HTTP calls tới OpenAI/Claude API dùng `net/http`

### PHASE 18 — Swagger Docs

- [x] DONE **18.1** Thêm `swaggo/swag` annotations vào tất cả handlers
- [x] DONE **18.2** Generate `docs/` và serve tại `/api/v1/docs`

### PHASE 19 — Tests

- [ ] TODO **19.1** Unit tests cho `service/auth`, `service/search`, `service/price`
- [ ] TODO **19.2** Integration tests cho DB queries (dùng test DB)
- [ ] TODO **19.3** Handler tests dùng `httptest`

### PHASE 20 — Cutover

- [ ] TODO **20.1** Verify tất cả 94 endpoints đều hoạt động (so sánh với Node.js)
- [ ] TODO **20.2** Load test với k6 hoặc wrk — target 1000 concurrent users
- [x] DONE **20.3** Cập nhật `docker-compose.yml` — đổi `backend` service sang Go image, xóa Node.js service
- [ ] TODO **20.4** Xóa `backend/` (Node.js) sau khi Go backend ổn định

---

## Ghi chú quan trọng

- **Migrations**: Giữ nguyên tất cả SQL files, chỉ đổi runner từ `node-pg-migrate` → `goose`. Schema không thay đổi.
- **Frontend**: Không đổi gì — Next.js vẫn gọi cùng API prefix `/api/v1/*`.
- **Redis**: Giữ nguyên key naming convention trong `CacheKeys` để cache không bị invalidate khi cutover.
- **Env vars**: Giữ nguyên tên env vars — `docker-compose.yml` không cần sửa (trừ image).
- **Thứ tự ưu tiên**: Phase 0–5 là core (search + prices là tính năng chính của app), làm trước. Phase 6–17 làm sau.
