# Requirements Document

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
2. THE System SHALL support two authenticated user roles: Administrator and Reviewer
3. WHEN an authenticated user logs in successfully, THE System SHALL redirect them to their appropriate dashboard
4. WHEN authentication fails, THE System SHALL display an error message and remain on login page
5. THE System SHALL maintain authenticated user sessions for 24 hours unless manually logged out
6. THE System SHALL provide public access to all search and comparison features without requiring authentication

### Requirement 2: Administrator Dashboard Management

**User Story:** Là một Administrator, tôi muốn quản lý toàn bộ hệ thống thông qua dashboard, để có thể thiết lập cấu hình và quản lý Reviewer.

#### Acceptance Criteria

1. THE Administrator SHALL access a comprehensive dashboard for system management
2. THE System SHALL allow Administrator to configure website logo, theme, and branding
3. THE System SHALL allow Administrator to manage advertisement placements and content
4. THE System SHALL allow Administrator to create, edit, and delete Reviewer accounts
5. THE System SHALL allow Administrator to assign and modify Reviewer permissions
6. THE System SHALL provide analytics and reporting on website usage and performance

### Requirement 3: Reviewer Content Management

**User Story:** Là một Reviewer, tôi muốn tạo và duyệt nội dung bài viết, để đảm bảo chất lượng thông tin trên website.

#### Acceptance Criteria

1. THE Reviewer SHALL access a content management dashboard
2. WHEN a Reviewer enters a keyword, THE AI_Content_Generator SHALL create a product article
3. THE System SHALL allow Reviewer to edit AI-generated articles before publishing
4. THE System SHALL require Reviewer approval before any article goes live
5. THE System SHALL maintain a queue of pending articles for review
6. THE System SHALL allow Reviewer to reject articles with feedback comments

### Requirement 4: Public Product Search and Discovery

**User Story:** Là một Public_User, tôi muốn tìm kiếm sản phẩm bằng từ khóa mà không cần đăng nhập, để có thể so sánh giá từ nhiều nguồn khác nhau một cách dễ dàng.

#### Acceptance Criteria

1. THE System SHALL provide a public search interface for any visitor to enter keywords without authentication
2. WHEN a keyword is entered, THE System SHALL return relevant products within 3 seconds
3. THE System SHALL display search results with product images, names, and price ranges to all visitors
4. THE System SHALL support search filters by category, price range, and brand for public access
5. THE System SHALL provide search suggestions as any user types
6. THE System SHALL track and display popular search keywords publicly

### Requirement 5: Public Price Comparison Engine

**User Story:** Là một Public_User, tôi muốn xem so sánh giá chi tiết của sản phẩm mà không cần đăng nhập, để có thể đưa ra quyết định mua hàng tốt nhất một cách thuận tiện.

#### Acceptance Criteria

1. WHEN any visitor selects a product, THE System SHALL display prices from multiple E_Commerce_Platforms
2. THE System SHALL update price information at least every 6 hours for public access
3. THE System SHALL display price history and trends for each product to all visitors
4. THE System SHALL highlight the lowest price and best deals for public viewing
5. THE System SHALL provide direct links to purchase on each E_Commerce_Platform for all users
6. IF price data is unavailable, THEN THE System SHALL display "Price not available" message to all visitors

### Requirement 6: Data Collection and Integration

**User Story:** Là hệ thống, tôi cần thu thập dữ liệu sản phẩm từ nhiều nguồn khác nhau trên internet, để cung cấp thông tin so sánh giá toàn diện và chính xác nhất.

#### Acceptance Criteria

1. THE System SHALL integrate with APIs of major E_Commerce_Platforms (Tiki, TikTok Shop, Lazada)
2. THE System SHALL scrape product data from retail websites when APIs are not available
3. WHEN a product keyword is provided, THE System SHALL search and collect price data from multiple public websites beyond major e-commerce platforms
4. THE System SHALL crawl and scrape data from various online retail stores, shop websites, and marketplace platforms
5. THE System SHALL use product keywords to discover new price sources automatically across the internet
6. THE System SHALL validate and normalize product data from different sources with varying data formats
7. THE System SHALL handle rate limiting, API quotas, and anti-scraping measures appropriately
8. THE System SHALL implement rotating proxies and user agents for web scraping to avoid blocking
9. IF data collection fails, THEN THE System SHALL log errors and retry after 30 minutes
10. THE System SHALL store collected data in a structured database format with source attribution
11. THE System SHALL maintain a database of reliable price sources and continuously discover new ones

### Requirement 7: Content Generation and Management

**User Story:** Là một Reviewer, tôi muốn sử dụng AI để tạo nội dung bài viết, để tăng hiệu quả công việc và đảm bảo chất lượng nội dung.

#### Acceptance Criteria

1. WHEN a Reviewer provides a keyword, THE AI_Content_Generator SHALL create a comprehensive product article
2. THE AI_Content_Generator SHALL include product descriptions, specifications, and comparison tables
3. THE System SHALL generate SEO-optimized content with proper meta tags and descriptions
4. THE System SHALL ensure generated content is unique and not duplicated
5. THE System SHALL allow manual editing of AI-generated content before publication
6. THE System SHALL maintain version history of article edits

### Requirement 8: Public Website Performance and Responsive Design

**User Story:** Là một Public_User, tôi muốn website tải nhanh và hoạt động mượt mà trên mọi thiết bị đặc biệt là mobile/tablet, để có trải nghiệm tốt nhất khi truy cập mà không cần đăng nhập.

#### Acceptance Criteria

1. THE System SHALL load pages within 2 seconds on standard internet connections for all public visitors
2. THE System SHALL prioritize mobile and tablet user experience with optimized responsive design
3. THE System SHALL ensure smooth operation across all screen sizes from 320px to 4K displays
4. THE System SHALL optimize loading speed specifically for mobile networks and slower connections
5. THE System SHALL implement touch-friendly interface elements for mobile and tablet users
6. THE System SHALL use progressive web app (PWA) features for better mobile experience
7. THE System SHALL implement SEO best practices for search engine visibility of public content
8. THE System SHALL generate XML sitemaps automatically for public pages
9. THE System SHALL implement structured data markup for products accessible to all visitors
10. THE System SHALL optimize images with responsive sizing and lazy loading for all devices
11. THE System SHALL minimize JavaScript and CSS bundle sizes for faster mobile loading

### Requirement 9: Analytics and Public Usage Monitoring

**User Story:** Là một Administrator, tôi muốn theo dõi hiệu suất website và hành vi của người dùng công khai, để có thể tối ưu hóa trải nghiệm và nội dung cho tất cả visitors.

#### Acceptance Criteria

1. THE System SHALL track public user interactions, search queries, and page views without requiring authentication
2. THE System SHALL provide real-time analytics dashboard for Administrator about public usage
3. THE System SHALL monitor system performance and uptime for public access
4. THE System SHALL generate automated reports on popular products and search trends from public users
5. THE System SHALL alert Administrator when system errors or performance issues affect public access
6. THE System SHALL comply with privacy regulations for public user data collection

### Requirement 10: Flexible Advertisement Management System

**User Story:** Là một Administrator, tôi muốn quản lý hệ thống quảng cáo linh hoạt với nhiều định dạng và vị trí tùy chỉnh cho người dùng công khai trên website, để tạo ra nguồn doanh thu tối ưu mà không ảnh hưởng đến trải nghiệm của visitors.

#### Acceptance Criteria

1. THE System SHALL support flexible advertisement placement at any customizable position on public pages
2. THE Administrator SHALL configure advertisement positions, sizes, and display timing through dashboard interface
3. THE System SHALL support Google Ads integration with JavaScript code embedding capability
4. THE System SHALL support static banner image advertisements with upload and management functionality
5. THE Administrator SHALL customize advertisement dimensions, placement locations, and display schedules
6. THE System SHALL allow Administrator to create, edit, and delete advertisement zones dynamically
7. THE System SHALL support multiple advertisement formats (header, footer, sidebar, in-content, overlay, floating)
8. THE System SHALL track advertisement performance and click-through rates from public users
9. THE System SHALL support both internal promotions and third-party advertisements for public display
10. THE System SHALL ensure advertisements do not interfere with core search and comparison functionality for public users
11. THE System SHALL allow Administrator to approve or reject advertisement content displayed to public visitors
12. THE System SHALL provide A/B testing capabilities for different advertisement placements and formats

### Requirement 11: Product Category Management System

**User Story:** Là một Public_User, tôi muốn duyệt sản phẩm theo danh mục rõ ràng và có cấu trúc, để có thể tìm kiếm sản phẩm dễ dàng hơn trong các nhóm sản phẩm cụ thể mà không cần đăng nhập.

#### Acceptance Criteria

1. THE System SHALL support hierarchical category structure with main categories and subcategories
2. THE System SHALL provide the following main product categories accessible to all public users:
   - Điện lạnh (Refrigeration & Air Conditioning)
   - Thiết bị gia dụng (Home Appliances)
   - Điện thoại (Mobile Phones)
   - Máy tính bảng (Tablets)
   - Laptop
   - Cơ khí (Mechanical Equipment)
   - Thiết bị văn phòng (Office Equipment)
   - Âm thanh & Hình ảnh (Audio & Video)
   - Phụ kiện điện tử (Electronic Accessories)
   - Đồ gia dụng nhà bếp (Kitchen Appliances)
3. THE Administrator SHALL create, edit, and delete product categories through the dashboard
4. THE Administrator SHALL organize categories in parent-child hierarchical relationships
5. THE System SHALL allow Administrator to assign multiple categories to a single product
6. THE System SHALL display category navigation menu on all public pages for easy browsing
7. WHEN a Public_User selects a category, THE System SHALL display all products within that category and its subcategories
8. THE System SHALL show product count for each category in the navigation menu
9. THE System SHALL support category-based filtering in search results for public users
10. THE System SHALL generate SEO-friendly URLs for each category page (e.g., /dien-lanh, /dien-thoai)
11. THE System SHALL automatically suggest appropriate categories when AI generates product articles
12. THE System SHALL maintain category metadata including Vietnamese name, English name, description, and icon
13. THE System SHALL support category-specific featured products and promotional banners
14. THE System SHALL track and display popular categories based on public user browsing behavior

### Requirement 12: Affiliate Link Management System

**User Story:** Là một Administrator, tôi muốn quản lý các liên kết affiliate với refer-code cho từng sàn thương mại điện tử, để có thể tạo doanh thu từ các giao dịch mua hàng của người dùng thông qua website mà không ảnh hưởng đến trải nghiệm người dùng.

#### Acceptance Criteria

1. THE Administrator SHALL configure affiliate settings for each E_Commerce_Platform through the dashboard
2. THE System SHALL support affiliate configuration for multiple platforms including:
   - Tiki (Tiki Affiliate Program)
   - Lazada (Lazada Affiliate Program)
   - TikTok Shop (TikTok Affiliate)
   - Shopee (Shopee Affiliate)
   - Sendo (Sendo Affiliate)
   - Custom retail websites with affiliate programs
3. THE Administrator SHALL input and manage refer-code/affiliate-id for each platform
4. THE Administrator SHALL configure affiliate link templates with dynamic parameters (product_id, refer_code, campaign_id)
5. THE System SHALL automatically append refer-code to all product purchase links displayed to public users
6. THE System SHALL support multiple affiliate link formats:
   - Query parameter format: ?ref=CODE or ?aff_id=CODE
   - Path parameter format: /r/CODE/product-url
   - Subdomain format: CODE.platform.com/product
   - Custom URL structure per platform
7. THE System SHALL allow Administrator to enable/disable affiliate links per platform
8. THE System SHALL track affiliate link clicks and conversions for each platform
9. THE System SHALL generate affiliate performance reports showing clicks, conversions, and estimated revenue
10. THE System SHALL support A/B testing of different refer-codes for the same platform
11. THE System SHALL cache affiliate link configurations for optimal performance
12. THE System SHALL validate affiliate link formats before saving to prevent broken links
13. THE System SHALL provide fallback to direct product links if affiliate configuration is disabled or invalid
14. THE System SHALL support campaign-specific refer-codes for tracking different marketing initiatives
15. THE System SHALL allow Administrator to set priority order when multiple affiliate programs are available for the same product
16. THE System SHALL log all affiliate link generations for audit and analytics purposes