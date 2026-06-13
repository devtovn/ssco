# SSCO — Website So Sánh Giá Sản Phẩm

Hệ thống so sánh giá từ nhiều sàn TMĐT (Tiki, Lazada, Shopee, …) cho thị trường Việt Nam. Monorepo gồm **Next.js 14** (frontend), **Express.js + TypeScript** (backend), **PostgreSQL**, **Redis**.

Spec & kế hoạch triển khai: xem thư mục `docs/` và các file `TASK-*-COMPLETION.md`.

---

## Yêu cầu hệ thống


| Công cụ        | Phiên bản gợi ý                   |
| -------------- | --------------------------------- |
| Node.js        | 20 LTS                            |
| npm            | 9+                                |
| Docker Desktop | (khuyến nghị) — Docker Compose v2 |
| Git            | —                                 |


RAM tối thiểu ~4 GB khi chạy đủ stack bằng Docker.

**Tên hạ tầng mặc định (Kombe):** Docker project `kombe`, database/user Postgres `kombe`, mật khẩu dev `kombe_dev_password`, container `kombe-postgres`, `kombe-redis`, `kombe-backend`, `kombe-frontend`. Nếu từng chạy bản cũ `price-comparison`, xóa volume/container cũ trước — xem [DOCKER-SETUP.md](DOCKER-SETUP.md#migrating-from-price-comparison-naming).

---

## Chạy nhanh

### Lần đầu tiên

Dùng khi **mới clone project** hoặc **chưa từng chạy migration**. Cần: Docker Desktop (đang chạy), Node.js 20 LTS, Git.

#### Bước 1 — Cấu hình môi trường

```powershell
cd D:\Dev\SSCO
copy .env.example .env
notepad .env
```

Trong `.env` (thư mục gốc repo), chỉnh ít nhất:


| Biến                               | Gợi ý                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `POSTGRES_PASSWORD`                | Mật khẩu Postgres (mặc định: `kombe_dev_password`) — **ghi nhớ** cho bước migration |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Chuỗi ngẫu nhiên (dev có thể giữ mẫu trong `.env.example`)                                 |
| `NEXT_PUBLIC_API_URL`              | `http://localhost:4000` — **không** thêm `/api`                                            |


Các key `OPENAI_API_KEY`, `TIKI_API_KEY`, … là tùy chọn khi dev cơ bản.

#### Bước 2 — Khởi động Docker (DB + Redis + API + Web)

```powershell
docker compose up -d --build
```

Hoặc script Windows (nếu PowerShell báo lỗi execution policy):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\docker-start.ps1
```

Chờ 30–60 giây, kiểm tra container:

```powershell
docker compose ps
```

Cần thấy `postgres` và `redis` ở trạng thái **healthy** (backend/frontend có thể `starting` vài phút).

Kiểm tra API sống (chưa cần DB đầy đủ):

```powershell
Invoke-WebRequest http://localhost:4000/health -UseBasicParsing
```

#### Bước 3 — Migration database (bắt buộc, chạy trên máy host)

Migration **không** tự chạy khi `docker compose up`. Tạo bảng + seed admin, danh mục, affiliate.

```powershell
cd D:\Dev\SSCO\packages\types
npm install
npm run build

cd D:\Dev\SSCO\backend
npm install

# Thay YOUR_PASSWORD bằng POSTGRES_PASSWORD trong .env
$env:DATABASE_URL = "postgresql://kombe:YOUR_PASSWORD@localhost:5432/kombe"
npm run migrate:up
```

Ví dụ mật khẩu mặc định:

```powershell
$env:DATABASE_URL = "postgresql://kombe:kombe_dev_password@localhost:5432/kombe"
npm run migrate:up
```

Thành công khi thấy dòng `Migrations complete!`. Lệnh này **không** chạy trong container `backend` (sẽ lỗi file `.ts`).

Kiểm tra nhanh (tùy chọn):

```powershell
docker compose exec postgres psql -U kombe -d kombe -c "SELECT email, role FROM users;"
```

Phải có user `admin@kombe.vn` | `Administrator`.

#### Bước 4 — Khởi động lại backend

Sau migration lần đầu, recreate backend để chắc chắn kết nối DB/Redis đúng:

```powershell
cd D:\Dev\SSCO
docker compose up -d --force-recreate backend
```

#### Bước 5 — Mở ứng dụng


| Mục             | URL / thông tin                                                  |
| --------------- | ---------------------------------------------------------------- |
| Website         | [http://localhost:3000](http://localhost:3000)                   |
| Đăng nhập admin | [http://localhost:3000/login](http://localhost:3000/login)       |
| API             | [http://localhost:4000/api](http://localhost:4000/api)           |
| Swagger         | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |
| Health          | [http://localhost:4000/health](http://localhost:4000/health)     |


**Tài khoản admin mặc định** (sau migration):


|          |                         |
| -------- | ----------------------- |
| Email    | `admin@kombe.vn` |
| Mật khẩu | `Admin@123456`          |


Đổi mật khẩu khi dùng môi trường thật. Quên mật khẩu / reset: `npm run db:reset-admin` trong `backend/` — xem [backend/MIGRATIONS.md](backend/MIGRATIONS.md).

#### Lỗi thường gặp (lần đầu)


| Triệu chứng                        | Cách xử lý                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Route not found` tại `:4000`      | Bình thường — dùng `/health` hoặc `/api/...`, không phải `/`                                          |
| `Route not found` khi đăng nhập    | Chưa migrate hoặc `NEXT_PUBLIC_API_URL` sai — phải `http://localhost:4000` (không `/api`)             |
| `relation "users" does not exist`  | Chưa chạy bước 3 `npm run migrate:up`                                                                 |
| PowerShell chặn `docker-start.ps1` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`                                                 |
| Frontend lỗi Tailwind / 500        | Rebuild frontend: `docker compose build --no-cache frontend` (xem [DOCKER-SETUP.md](DOCKER-SETUP.md)) |


Chi tiết migration (lần 2, reset DB, rollback): **[backend/MIGRATIONS.md](backend/MIGRATIONS.md)**.

### Lần sau (đã setup xong)

```powershell
cd D:\Dev\SSCO
docker compose up -d
```

Chỉ chạy `npm run migrate:up` khi pull code có **file migration mới** — xem [backend/MIGRATIONS.md](backend/MIGRATIONS.md).

---

## Cấu trúc thư mục

```
SSCO/
├── backend/          # API Express.js
├── frontend/         # Next.js App Router
├── packages/types/   # Shared TypeScript types (@kombe/types)
├── docker-compose.yml
├── docker-compose.prod.yml
├── scripts/          # deploy, init-db, …
├── tests/e2e/        # Playwright
└── .env.example      # Biến môi trường mẫu (root, dùng cho Docker)
```

---

## Cách 1 — Chạy bằng Docker Compose (khuyến nghị)

Phù hợp khi muốn chạy **PostgreSQL + Redis + Backend + Frontend** cùng lúc, không cần cài DB trên máy.

### Bước 1: Cấu hình môi trường

Tại thư mục gốc repo:

```powershell
cd D:\Dev\SSCO
copy .env.example .env
```

Mở `.env` và chỉnh (ít nhất):

- `JWT_SECRET`, `JWT_REFRESH_SECRET` — chuỗi bí mật ngẫu nhiên
- `POSTGRES_PASSWORD` — mật khẩu DB (khớp với bước migration bên dưới)
- `NEXT_PUBLIC_API_URL=http://localhost:4000` — **không** thêm `/api` (frontend tự nối prefix)

Các API key (`OPENAI_API_KEY`, `TIKI_API_KEY`, …) là **tùy chọn** cho dev cơ bản.

### Bước 2: Khởi động container

```powershell
docker compose up -d --build
```

Hoặc dùng script có sẵn (Windows):

```powershell
.\docker-start.ps1
```

Chờ ~30–60 giây, kiểm tra:

```powershell
docker compose ps
curl http://localhost:4000/health
```

### Bước 3: Chạy migration database

Migration **không** tự chạy khi container lên. Chạy từ **máy host** (cần Node.js 20).

Hướng dẫn đầy đủ (lần đầu, lần n, reset DB, reset admin): **[backend/MIGRATIONS.md](backend/MIGRATIONS.md)**.

Tóm tắt:

```powershell
cd D:\Dev\SSCO\packages\types
npm install
npm run build

cd D:\Dev\SSCO\backend
npm install
$env:DATABASE_URL = "postgresql://kombe:kombe_dev_password@localhost:5432/kombe"
npm run migrate:up

cd D:\Dev\SSCO
docker compose up -d --force-recreate backend
```

Đổi `kombe_dev_password` nếu bạn đã đổi `POSTGRES_PASSWORD` trong `.env`.

Migration tạo schema, seed danh mục, affiliate, và **tài khoản admin mặc định**.

### Bước 4: Truy cập ứng dụng


| Dịch vụ                | URL                                                              |
| ---------------------- | ---------------------------------------------------------------- |
| **Website (public)**   | [http://localhost:3000](http://localhost:3000)                   |
| **API**                | [http://localhost:4000/api](http://localhost:4000/api)           |
| **Swagger UI**         | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |
| **Health check**       | [http://localhost:4000/health](http://localhost:4000/health)     |
| **Metrics**            | [http://localhost:4000/metrics](http://localhost:4000/metrics)   |
| **Đăng nhập admin**    | [http://localhost:3000/login](http://localhost:3000/login)       |
| **Admin dashboard**    | [http://localhost:3000/admin](http://localhost:3000/admin)       |
| **Reviewer dashboard** | [http://localhost:3000/reviewer](http://localhost:3000/reviewer) |


**Tài khoản Administrator mặc định** (sau migration):


|          |                         |
| -------- | ----------------------- |
| Email    | `admin@kombe.vn` |
| Mật khẩu | `Admin@123456`          |


Đổi mật khẩu ngay khi dùng môi trường thật.

### Lệnh Docker hữu ích

```powershell
docker compose logs -f              # Xem log tất cả service
docker compose logs -f backend      # Log backend
docker compose restart backend
docker compose stop
docker compose down                 # Dừng và xóa container
docker compose down -v              # Xóa cả volume DB (mất dữ liệu)
```

---

## Cách 2 — Chạy local (Node.js + Docker chỉ cho DB)

Phù hợp khi develop frontend/backend với hot-reload, chỉ dùng Docker cho Postgres & Redis.

### Bước 1: Chạy Postgres và Redis

```powershell
cd D:\Dev\SSCO
copy .env.example .env
docker compose up -d postgres redis
```

### Bước 2: Build shared types

```powershell
cd packages\types
npm install
npm run build
```

### Bước 3: Backend

```powershell
cd ..\..\backend
copy .env.example .env
```

Cập nhật `backend\.env` như [mục DATABASE_URL ở Cách 1](#bước-3-chạy-migration-database).

```powershell
npm install
npm run migrate:up
npm run dev
```

API chạy tại **[http://localhost:4000](http://localhost:4000)** (đặt `PORT=4000` trong `backend\.env`).

### Bước 4: Frontend (terminal khác)

```powershell
cd D:\Dev\SSCO\frontend
```

Tạo `frontend\.env.local` (hoặc export biến môi trường):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

```powershell
npm install
npm run dev
```

Website: **[http://localhost:3000](http://localhost:3000)**

---

## Biến môi trường quan trọng

### Root `.env` (Docker Compose)


| Biến                                | Mô tả                                             |
| ----------------------------------- | ------------------------------------------------- |
| `POSTGRES_*`                        | Cấu hình PostgreSQL                               |
| `REDIS_PORT`                        | Port Redis (6379)                                 |
| `BACKEND_PORT`                      | Port API (4000)                                   |
| `FRONTEND_PORT`                     | Port web (3000)                                   |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Ký JWT                                            |
| `NEXT_PUBLIC_API_URL`               | URL gốc API cho browser (`http://localhost:4000`) |
| `OPENAI_API_KEY` / `CLAUDE_API_KEY` | AI sinh bài viết (reviewer)                       |
| `DATA_COLLECTION_ENABLED`           | `true` để bật worker thu thập giá (Bull + Redis)  |


Xem đầy đủ: `[.env.example](.env.example)`.

### `backend/.env` (chạy local / migrate)

Dùng `DB_*` hoặc `DATABASE_URL` — migration (`node-pg-migrate`) đọc `**DATABASE_URL`** qua `[.migrationrc.json](backend/.migrationrc.json)`.

---

## Kiểm thử

### Backend (Jest)

```powershell
cd backend
npm test
```

### Frontend (type-check / lint)

```powershell
cd frontend
npm run type-check
npm run lint
```

### E2E (Playwright)

Cần frontend đang chạy tại port 3000:

```powershell
cd D:\Dev\SSCO
npm install
npm run test:e2e
```

### Load test (Artillery)

Cần API đang chạy:

```powershell
npm run test:load
```

---

## Triển khai production

1. Sao chép và điền `.env` production (mật khẩu mạnh, API keys thật).
2. Chạy migration trước khi mở traffic.
3. Dùng Docker production:

```bash
# Linux / macOS / Git Bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Hoặc thủ công:

```powershell
docker compose -f docker-compose.prod.yml up -d --build
```

Chi tiết CDN: `[docs/CLOUDFLARE.md](docs/CLOUDFLARE.md)`.  
CI: `[.github/workflows/ci.yml](.github/workflows/ci.yml)`.

---

## Xử lý sự cố thường gặp

**Frontend không gọi được API**

- Kiểm tra `NEXT_PUBLIC_API_URL=http://localhost:4000` (không có `/api` ở cuối).
- Kiểm tra `CORS_ORIGIN=http://localhost:3000` trong `backend/.env`.

**Lỗi kết nối database**

- Postgres đã chạy: `docker compose ps`.
- `DATABASE_URL` / `DB_`* khớp user/password/database trong `.env`.
- Đã chạy `npm run migrate:up` trong `backend/`.

`**@kombe/types` not found**

```powershell
cd packages\types
npm install
npm run build
```

Sau đó `npm install` lại trong `backend/` và `frontend/`.

**Port bị chiếm**

Đổi `BACKEND_PORT` / `FRONTEND_PORT` / `POSTGRES_PORT` trong `.env` và cập nhật `NEXT_PUBLIC_API_URL` tương ứng.

**npm install lỗi SSL (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`)**

Thường do proxy/corporate CA — cấu hình chứng chỉ Node hoặc liên hệ quản trị mạng. Chỉ dùng `npm config set strict-ssl false` tạm thời trên máy dev nếu hiểu rủi ro.

---

## Tài liệu thêm


| File                                                                                              | Nội dung                  |
| ------------------------------------------------------------------------------------------------- | ------------------------- |
| `[DOCKER-SETUP.md](DOCKER-SETUP.md)`                                                              | Hướng dẫn Docker chi tiết |
| `[backend/MIGRATIONS_README.md](backend/MIGRATIONS_README.md)`                                    | Migration DB              |
| `[backend/MIGRATIONS.md](backend/MIGRATIONS.md)`                                                    | Chạy migration thủ công   |


---

## Giấy phép

MIT — xem file `LICENSE` nếu có trong repo.