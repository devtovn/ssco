# Database migrations — SSCO

Migration dùng [node-pg-migrate](https://github.com/salsita/node-pg-migrate). Mỗi file trong `backend/migrations/` tạo bảng hoặc seed dữ liệu mặc định.

**Migration không tự chạy** khi `docker compose up`. Bạn chạy thủ công từ **máy host** (cần Node.js 20), kết nối Postgres qua `localhost:5432`.

---

## Lần đầu tiên (setup mới)

Giả sử đã cài: **Docker Desktop**, **Node.js 20**, **Git**.

### 1. Clone và cấu hình

```powershell
cd D:\Dev\SSCO
copy .env.example .env
```

Trong `.env` (thư mục gốc), tối thiểu:

- `POSTGRES_PASSWORD` — ghi nhớ, dùng cho `DATABASE_URL` bên dưới
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `NEXT_PUBLIC_API_URL=http://localhost:4000` (không thêm `/api`)

### 2. Bật Docker stack

```powershell
docker compose up -d --build
```

Hoặc (PowerShell — nếu bị chặn script):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.\docker-start.ps1
```

Chờ `docker compose ps` — postgres và redis **healthy**.

### 3. Cài dependency & chạy migration (một lần)

```powershell
cd D:\Dev\SSCO\packages\types
npm install
npm run build

cd D:\Dev\SSCO\backend
npm install

$env:DATABASE_URL = "postgresql://kombe:YOUR_POSTGRES_PASSWORD@localhost:5432/kombe"
npm run migrate:up
```

Thay `YOUR_POSTGRES_PASSWORD` bằng `POSTGRES_PASSWORD` trong `.env` (mặc định: `kombe_dev_password`).

Migration sẽ:

- Tạo toàn bộ schema (bảng users, products, categories, …)
- Seed **admin**, danh mục, cấu hình affiliate (trong các migration tạo bảng)

### 4. Khởi động lại backend (sau lần migrate đầu)

```powershell
cd D:\Dev\SSCO
docker compose up -d --force-recreate backend
```

### 5. Đăng nhập

| | |
|---|---|
| URL | http://localhost:3000/login |
| Email | `admin@kombe.vn` |
| Mật khẩu | `Admin@123456` |

API kiểm tra: http://localhost:4000/health

---

## Lần thứ 2, 3, … n (hàng ngày)

**Không cần** chạy lại `migrate:up` nếu không có migration mới trong git.

```powershell
cd D:\Dev\SSCO
docker compose up -d
```

Chỉ cần Docker Desktop đang chạy. Mở http://localhost:3000.

Dừng stack:

```powershell
docker compose stop
```

---

## Khi nào chạy lại `migrate:up`?

Chạy khi **pull code mới** có thêm file trong `backend/migrations/`:

```powershell
cd D:\Dev\SSCO\backend
$env:DATABASE_URL = "postgresql://kombe:YOUR_POSTGRES_PASSWORD@localhost:5432/kombe"
npm run migrate:up
docker compose restart backend
```

`migrate:up` chỉ áp dụng migration **chưa chạy** (theo bảng `pgmigrations`).

---

## Lệnh migration thường dùng

| Lệnh | Mục đích |
|------|----------|
| `npm run migrate:up` | Áp dụng migration mới (lên) |
| `npm run migrate:down` | Rollback **1** migration gần nhất |
| `npm run db:reset-admin` | Đặt lại mật khẩu admin (`Admin@123456`) |

Tạo migration mới (dev):

```powershell
npm run migrate:create -- tên-mô-tả-ngắn
```

---

## Reset toàn bộ database (xóa sạch dữ liệu)

```powershell
cd D:\Dev\SSCO
docker compose down -v
docker compose up -d
# Chờ postgres healthy, rồi chạy lại mục "Lần đầu" bước 3–4
```

---

## Reset mật khẩu admin (giữ nguyên dữ liệu)

```powershell
cd D:\Dev\SSCO\backend
$env:DATABASE_URL = "postgresql://kombe:YOUR_POSTGRES_PASSWORD@localhost:5432/kombe"
npm run db:reset-admin
```

---

## Kiểm tra nhanh

```powershell
# Đã migrate chưa?
docker compose exec postgres psql -U kombe -d kombe -c "SELECT COUNT(*) FROM pgmigrations;"

# Có user admin chưa?
docker compose exec postgres psql -U kombe -d kombe -c "SELECT email, role FROM users;"
```

---

## Lưu ý

- **Không** chạy `npm run migrate:up` trong container `backend` (lỗi TypeScript `.ts`). Luôn chạy trên host.
- `DATABASE_URL` trên host dùng `localhost:5432`; trong Docker backend dùng `DB_HOST=postgres` (đã cấu hình trong `docker-compose.yml`).
- File `.env` ở **thư mục gốc** dùng cho Docker; migration chỉ cần biến `DATABASE_URL` (có thể set tạm trong PowerShell như trên).

Chi tiết Docker: [DOCKER-SETUP.md](../DOCKER-SETUP.md). Hướng dẫn tổng: [README.md](../README.md).
