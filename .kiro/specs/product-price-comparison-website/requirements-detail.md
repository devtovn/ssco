# Requirements Document - Detailed Version for AI Code Generation

## Introduction

Hệ thống website so sánh giá sản phẩm là một trang web công khai cho phép bất kỳ ai cũng có thể truy cập, tìm kiếm và so sánh giá các sản phẩm từ nhiều sàn thương mại điện tử khác nhau như Tiki, TikTok Shop, Lazada và các website bán lẻ. Người dùng thường không cần đăng nhập để sử dụng các tính năng chính. Hệ thống chỉ yêu cầu đăng nhập cho hai loại người dùng quản lý: Administrator quản lý toàn bộ hệ thống và Reviewer tạo và duyệt nội dung bài viết.

## Glossary

- **System**: Hệ thống website so sánh giá sản phẩm
- **Administrator**: Người dùng có quyền quản lý toàn bộ hệ thống (cần đăng nhập)
- **Reviewer**: Người dùng có quyền tạo và duyệt nội dung bài viết (cần đăng nhập)
- **Public_User**: Người dùng công khai truy cập website để tìm kiếm và so sánh giá (không cần đăng nhập)
- **Product**: Sản phẩm cần so sánh giá
- **Category**: Danh mục sản phẩm có cấu trúc phân cấp (ví dụ: Điện lạnh, Thiết bị gia dụng, Điện thoại)
- **Price_Comparison**: Kết quả so sánh giá từ nhiều nguồn khác nhau
- **E_Commerce_Platform**: Các sàn thương mại điện tử như Tiki, TikTok Shop, Lazada
- **Article**: Bài viết về sản phẩm được tạo bởi AI hoặc Reviewer
- **Keyword**: Từ khóa tìm kiếm sản phẩm
- **AI_Content_Generator**: Công cụ AI tạo nội dung bài viết
- **Dashboard**: Giao diện quản lý cho Administrator và Reviewer
- **Affiliate_Link**: Liên kết giới thiệu có chứa refer-code để theo dõi và tạo doanh thu từ các giao dịch mua hàng
- **Refer_Code**: Mã giới thiệu duy nhất được cung cấp bởi các chương trình affiliate của sàn thương mại điện tử

## Requirements

### Requirement 1: Administrative User Authentication

**User Story:** Là một Administrator, tôi muốn đăng nhập vào hệ thống quản lý, để có thể quản lý toàn bộ website và phân quyền cho Reviewer.

#### Acceptance Criteria

1. THE System SHALL authenticate Administrator and Reviewer users using email and password
   - **Implementation Details**:
     - Use bcrypt for password hashing with salt rounds = 10
     - Email validation using regex pattern
     - Password minimum length: 8 characters
     - Store hashed passwords in `users` table
     - JWT token generation with payload: { userId, email, role, permissions }
     - Token expiration: 24 hours for access token, 7 days for refresh token

2. THE System SHALL support two authenticated user roles: Administrator and Reviewer
   - **Implementation Details**:
     - Role enum: 'Administrator' | 'Reviewer'
     - Store role in `users.role` column
     - Administrator permissions: full system access (all CRUD operations)
     - Reviewer permissions: content management only (create, edit, approve articles)
     - Implement RBAC middleware to check permissions on protected routes

3. WHEN an authenticated user logs in successfully, THE System SHALL redirect them to their appropriate dashboard
   - **Implementation Details**:
     - Administrator → `/admin/dashboard`
     - Reviewer → `/reviewer/dashboard`
     - Return redirect URL in login response: `{ token, redirectUrl, user: { id, email, role } }`

4. WHEN authentication fails, THE System SHALL display an error message and remain on login page
   - **Implementation Details**:
     - Return HTTP 401 Unauthorized
     - Error response: `{ error: 'Invalid email or password', code: 'AUTH_FAILED' }`
     - Frontend displays error message and keeps user on `/login` page

5. THE System SHALL maintain authenticated user sessions for 24 hours unless manually logged out
   - **Implementation Details**:
     - Store refresh tokens in Redis with TTL = 7 days
     - Access token TTL = 24 hours
     - Implement token refresh endpoint: `POST /api/auth/refresh`
     - On logout, invalidate refresh token in Redis

6. THE System SHALL provide public access to all search and comparison features without requiring authentication
   - **Implementation Details**:
     - No authentication middleware on public routes: `/`, `/search`, `/products/:id`, `/categories/:slug`
     - Optional user session tracking using cookies for analytics (no login required)

### Requirement 2: Administrator Dashboard Management

**User Story:** Là một Administrator, tôi muốn quản lý toàn bộ hệ thống thông qua dashboard, để có thể thiết lập cấu hình và quản lý Reviewer.

#### Acceptance Criteria

1. THE Administrator SHALL access a comprehensive dashboard for system management
   - **Implementation Details**:
     - Dashboard route: `GET /admin/dashboard` (protected, role: Administrator)
     - Display metrics: total products, total users, total articles, system uptime
     - Real-time analytics: search queries/day, page views/day, affiliate clicks/day
