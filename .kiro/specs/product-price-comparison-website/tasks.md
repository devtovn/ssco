# Implementation Plan: Product Price Comparison Website

## Overview

This implementation plan breaks down the Product Price Comparison Website into discrete coding tasks. The system is a public-facing web application for the Vietnamese market that enables users to search and compare product prices from multiple e-commerce platforms without authentication. The implementation uses Next.js 14 for the frontend, Express.js with TypeScript for the backend, PostgreSQL for data storage, and Redis for caching.

The implementation follows a layered approach:
1. Project setup and database foundation
2. Core backend services and business logic
3. Data collection and AI integration
4. Authentication and admin services
5. Public-facing frontend pages
6. Admin and reviewer dashboards
7. Performance optimization and deployment

## Tasks

- [x] 1. Set up project structure and development environment
  - [x] 1.1 Initialize Next.js 14 frontend project
    - Create Next.js 14 project with App Router and TypeScript
    - Configure Tailwind CSS with Headless UI components
    - Set up Zustand for client-side state management
    - Configure Next-PWA for progressive web app features
    - Configure ESLint, Prettier, and TypeScript
    - Set up project folder structure (app, components, lib, types)
    - _Requirements: 8.2, 8.3, 8.6_
  
  - [x] 1.2 Initialize Express.js backend project
    - Create Express.js backend project with TypeScript configuration
    - Set up project folder structure (src/services, src/routes, src/middleware, src/models)
    - Configure OpenAPI 3.0 with Swagger UI for API documentation
    - Configure ESLint, Prettier, and TypeScript
    - Set up environment variable management with dotenv
    - _Requirements: 8.1_
  
  - [x] 1.3 Create shared types package
    - Set up monorepo structure with shared types package
    - Create package.json for shared types
    - Configure TypeScript for shared types compilation
    - Set up build scripts for shared types
    - _Requirements: 4.1, 5.1_
  
  - [x] 1.4 Set up Docker Compose for local development
    - Create Dockerfile for Next.js frontend with multi-stage build
    - Create Dockerfile for Express.js backend with multi-stage build
    - Create Docker Compose file with services: frontend, backend, PostgreSQL, Redis
    - Configure environment variables for Docker services
    - Add volume mounts for development hot-reload
    - _Requirements: 8.1_

- [ ] 2. Create database schema and infrastructure
  - [x] 2.1 Create core database tables
    - Implement products table with indexes (category, brand, keywords, name search)
    - Implement categories table with hierarchical structure and indexes
    - Implement product_categories junction table with indexes
    - Implement price_entries table with indexes (product_id, source, scraped_at)
    - Set up database migration system using node-pg-migrate
    - _Requirements: 4.1, 5.1, 11.1, 11.2_
  
  - [x] 2.2 Create affiliate and advertisement tables
    - Implement affiliate_configs table with platform configurations
    - Implement affiliate_campaigns table with campaign tracking
    - Implement affiliate_link_clicks table with partitioning by month
    - Implement ad_zones and advertisements tables
    - Create indexes for affiliate and advertisement queries
    - _Requirements: 10.1, 12.1, 12.2, 12.3_
  
  - [x] 2.3 Create user and content management tables
    - Implement users table for Administrator and Reviewer roles
    - Implement articles table with version control
    - Implement search_logs table for analytics
    - Create indexes for user and content queries
    - _Requirements: 1.1, 1.2, 3.1, 4.6, 9.1_
  
  - [x] 2.4 Seed default data
    - Write seed script for 10 default categories (Điện lạnh, Thiết bị gia dụng, etc.)
    - Write seed script for 5 default affiliate configurations (Tiki, Lazada, TikTok Shop, Shopee, Sendo)
    - Create default Administrator account
    - Verify all seed data is inserted correctly
    - _Requirements: 11.2, 12.2_
  
  - [x] 2.5 Set up Redis cache and connection pooling
    - Configure Redis 7 connection with 512 MB allocation
    - Implement connection pooling for PostgreSQL with read replicas support
    - Create cache key constants and TTL configurations
    - Implement cache utility functions (get, set, delete, invalidate patterns)
    - Add cache warming for frequently accessed data
    - _Requirements: 8.1, 8.10_

- [x] 3. Implement shared types and validation schemas
  - [x] 3.1 Create core TypeScript interfaces
    - Define Product, Category, PriceEntry, PriceComparison interfaces
    - Define SearchQuery, SearchResult, PopularKeyword interfaces
    - Define AffiliateConfig, AffiliateCampaign, AffiliateLinkClick interfaces
    - Define User, Article, AdZone, Advertisement interfaces
    - Export all interfaces from shared types package
    - _Requirements: 4.1, 5.1, 11.1, 12.1_
  
  - [x] 3.2 Create Zod validation schemas
    - Create Zod schemas for all request/response types
    - Implement validation for search queries and filters
    - Implement validation for affiliate configurations
    - Implement validation for category management
    - Implement validation for user authentication
    - Create validation middleware for Express.js
    - _Requirements: 4.1, 4.4, 11.3, 12.4_

- [x] 4. Implement Category Management Service
  - [x] 4.1 Create CategoryManagementService class
    - Implement createCategory method with validation
    - Implement updateCategory method with validation
    - Implement deleteCategory method with cascade handling
    - Implement getCategoryTree method with recursive query
    - Implement assignProductToCategories method
    - Implement getProductsByCategory method with subcategory support
    - Implement getCategoryMetrics method for analytics
    - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.7, 11.14_
  
  - [x] 4.2 Add caching for category operations
    - Implement Redis caching for category tree (1 hour TTL)
    - Implement Redis caching for category products (10 minutes TTL)
    - Implement Redis caching for category metrics (30 minutes TTL)
    - Add cache invalidation on category updates
    - _Requirements: 8.1, 11.6_
  
  - [x] 4.3 Create REST API endpoints for categories
    - Create GET /api/categories/tree endpoint
    - Create GET /api/categories/:id/products endpoint
    - Create POST /api/categories endpoint (admin only)
    - Create PUT /api/categories/:id endpoint (admin only)
    - Create DELETE /api/categories/:id endpoint (admin only)
    - Create GET /api/categories/:id/metrics endpoint
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 5. Implement Search Service
  - [x] 5.1 Set up PostgreSQL Full-Text Search
    - Create GIN indexes for product name and keywords
    - Install and configure trigram extension for fuzzy matching
    - Create to_tsvector indexes for Vietnamese text search
    - Test search performance with sample data
    - _Requirements: 4.2_
  
  - [x] 5.2 Create SearchService class
    - Implement searchProducts method with fuzzy matching
    - Implement search filters (category, price range, brand)
    - Implement sorting options (relevance, price, popularity)
    - Implement pagination with limit and offset
    - Implement getSuggestions method using trigram similarity
    - Implement getPopularKeywords method with aggregation
    - Implement trackSearch method for analytics
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 5.3 Add caching for search operations
    - Implement Redis caching for search results (5 minutes TTL)
    - Implement Redis caching for popular keywords (30 minutes TTL)
    - Implement Redis caching for search suggestions (10 minutes TTL)
    - Add cache key hashing for query parameters
    - _Requirements: 8.1, 4.2_
  
  - [x] 5.4 Create REST API endpoints for search
    - Create GET /api/search endpoint with query parameters
    - Create GET /api/search/suggestions endpoint
    - Create GET /api/search/popular-keywords endpoint
    - Add rate limiting for search endpoints
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

- [x] 6. Implement Price Comparison Service
  - [x] 6.1 Create PriceComparisonService class
    - Implement getProductPrices method with multi-source aggregation
    - Implement getPriceHistory method with time-series queries
    - Implement getBestDeals method with category filtering
    - Implement updatePrices method for scheduled updates
    - Calculate average prices and identify lowest prices
    - Calculate price trends (increasing, decreasing, stable)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 6.2 Add caching for price operations
    - Implement Redis caching for price comparisons (1 hour TTL)
    - Implement Redis caching for price history (2 hours TTL)
    - Implement Redis caching for best deals (30 minutes TTL)
    - Add cache invalidation on price updates
    - _Requirements: 8.1, 5.2_
  
  - [x] 6.3 Create REST API endpoints for prices
    - Create GET /api/products/:id/prices endpoint
    - Create GET /api/products/:id/price-history endpoint
    - Create GET /api/deals endpoint with category filter
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Implement Affiliate Link Management Service
  - [x] 7.1 Create AffiliateLinkService class
    - Implement createAffiliateConfig method with validation
    - Implement updateAffiliateConfig method with validation
    - Implement deleteAffiliateConfig method
    - Implement getAffiliateConfigs method with filtering
    - Implement validateAffiliateLinkFormat method
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.12_
  
  - [x] 7.2 Implement affiliate link generation
    - Implement generateAffiliateLink method with template parsing
    - Support query_param format (?ref=CODE, ?aff_id=CODE)
    - Support path_param format (/r/CODE/product-url)
    - Support subdomain format (CODE.platform.com/product)
    - Support custom URL structure per platform
    - Implement refer-code injection with campaign support
    - Add fallback to direct links if config is invalid
    - _Requirements: 12.5, 12.6, 12.13, 12.14_
  
  - [x] 7.3 Implement affiliate tracking and analytics
    - Implement trackAffiliateLinkClick method with metadata capture
    - Store user_session, user_agent, referrer, product_id
    - Implement getAffiliatePerformance method with date range filtering
    - Calculate clicks, conversions, conversion rate, estimated revenue
    - Aggregate top products by affiliate performance
    - Implement campaign-specific tracking
    - _Requirements: 12.8, 12.9, 12.16_
  
  - [x] 7.4 Add caching for affiliate operations
    - Implement Redis caching for all affiliate configs (1 hour TTL)
    - Implement Redis caching for affiliate config by platform (1 hour TTL)
    - Implement Redis caching for active campaigns (30 minutes TTL)
    - Implement Redis caching for affiliate performance (10 minutes TTL)
    - Add cache invalidation on config updates
    - _Requirements: 8.1, 12.11_
  
  - [x] 7.5 Create REST API endpoints for affiliate management
    - Create GET /api/affiliate/configs endpoint
    - Create POST /api/affiliate/configs endpoint (admin only)
    - Create PUT /api/affiliate/configs/:platformId endpoint (admin only)
    - Create DELETE /api/affiliate/configs/:platformId endpoint (admin only)
    - Create POST /api/affiliate/generate-link endpoint
    - Create POST /api/affiliate/track-click endpoint
    - Create GET /api/affiliate/performance/:platformId endpoint
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.8, 12.9_

- [ ] 8. Implement data collection services
  - [ ] 8.1 Create API integrator for e-commerce platforms
    - Implement API client for Tiki API with authentication
    - Implement API client for Lazada API with authentication
    - Implement API client for TikTok Shop API with authentication
    - Add rate limiting with exponential backoff and jitter
    - Implement API key rotation for handling quotas
    - Add data normalization for different API response formats
    - Implement error handling with fallback to web scraping
    - _Requirements: 6.1, 6.6, 6.7_
  
  - [ ] 8.2 Implement web scraper with Puppeteer
    - Create web scraper service using Puppeteer for dynamic content
    - Implement proxy rotation for avoiding IP blocks
    - Add CAPTCHA detection and handling
    - Implement product data extraction from retail websites
    - Add data validation and normalization
    - Implement retry logic with different proxies
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.8_
  
  - [ ] 8.3 Set up scraping job queue with Bull Queue
    - Configure Bull Queue with Redis for background jobs
    - Create job types for API collection and web scraping
    - Implement job scheduling for periodic updates (every 6 hours)
    - Add job retry logic with exponential backoff
    - Implement job monitoring and error logging
    - _Requirements: 6.3, 6.9_
  
  - [ ] 8.4 Create DataCollectionService coordinator
    - Implement collectFromAPIs method with multi-source coordination
    - Implement scrapeWebsites method with URL management
    - Implement validateProductData method with quality checks
    - Implement scheduleCollection method for periodic updates
    - Store collected data in PostgreSQL with source attribution
    - Implement error recovery and retry mechanisms
    - Maintain database of reliable price sources
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.9, 6.10, 6.11_

- [ ] 9. Implement AI Content Generation Service
  - [ ] 9.1 Set up AI service integration
    - Configure OpenAI GPT-4 or Claude API client
    - Create Vietnamese market context prompts
    - Implement content generation templates
    - Add error handling and retry logic
    - _Requirements: 7.1, 7.2_
  
  - [ ] 9.2 Create ContentManagementService class
    - Implement generateArticle method with keyword input
    - Implement submitForReview method with status update
    - Implement approveArticle method with reviewer tracking
    - Implement publishArticle method with publication timestamp
    - Implement optimizeForSEO method with meta tag generation
    - Implement version control for article edits
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.1, 7.3, 7.4, 7.5, 7.6_
  
  - [ ] 9.3 Implement SEO optimization for generated content
    - Generate meta titles and descriptions
    - Create structured data markup (JSON-LD)
    - Generate Open Graph tags
    - Ensure content uniqueness validation
    - Add keyword optimization
    - _Requirements: 7.3, 8.7, 8.9_
  
  - [ ] 9.4 Create REST API endpoints for content management
    - Create POST /api/content/generate endpoint (reviewer only)
    - Create PUT /api/content/:id/edit endpoint (reviewer only)
    - Create POST /api/content/:id/submit endpoint (reviewer only)
    - Create POST /api/content/:id/approve endpoint (reviewer only)
    - Create POST /api/content/:id/publish endpoint (reviewer only)
    - Create GET /api/content/pending endpoint (reviewer only)
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 10. Implement authentication and authorization
  - [x] 10.1 Create authentication service with JWT
    - Implement JWT token generation with user payload
    - Implement JWT token verification middleware
    - Add password hashing with bcrypt (salt rounds: 10)
    - Implement refresh token mechanism with Redis storage
    - Create login endpoint with email/password validation
    - Create logout endpoint with token invalidation
    - Create token refresh endpoint
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 10.2 Implement role-based access control (RBAC)
    - Create RBAC middleware for route protection
    - Implement Administrator role permissions (full system access)
    - Implement Reviewer role permissions (content management only)
    - Add role validation on protected endpoints
    - Implement permission checking utilities
    - _Requirements: 1.2, 2.1, 3.1_
  
  - [x] 10.3 Create authentication API endpoints
    - Create POST /api/auth/login endpoint
    - Create POST /api/auth/logout endpoint
    - Create POST /api/auth/refresh endpoint
    - Create GET /api/auth/me endpoint for current user
    - Add rate limiting for authentication endpoints
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 1.1, 1.3, 1.4_

- [ ] 11. Implement Admin Service
  - [ ] 11.1 Create AdminService for system management
    - Implement updateWebsiteConfig method (logo, theme, branding)
    - Implement getWebsiteConfig method
    - Implement createReviewer method with password hashing
    - Implement updateReviewer method with permission updates
    - Implement deleteReviewer method
    - Implement getReviewers method with filtering
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 11.2 Create REST API endpoints for admin operations
    - Create GET /api/admin/config endpoint
    - Create PUT /api/admin/config endpoint (admin only)
    - Create POST /api/admin/reviewers endpoint (admin only)
    - Create PUT /api/admin/reviewers/:id endpoint (admin only)
    - Create DELETE /api/admin/reviewers/:id endpoint (admin only)
    - Create GET /api/admin/reviewers endpoint (admin only)
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [ ] 12. Implement Advertisement Service
  - [ ] 12.1 Create AdvertisementService class
    - Implement createAdZone method with position and size configuration
    - Implement updateAdPlacement method with timing configuration
    - Implement trackAdPerformance method (impressions, clicks)
    - Implement getPerformanceMetrics method with aggregation
    - Implement deleteAdZone method
    - Support Google Ads JavaScript embedding
    - Support static banner advertisements
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_
  
  - [ ] 12.2 Add caching for advertisement operations
    - Implement Redis caching for ad zone configurations (10 minutes TTL)
    - Implement Redis caching for ad performance metrics (5 minutes TTL)
    - Add cache invalidation on ad zone updates
    - _Requirements: 8.1, 10.1_
  
  - [ ] 12.3 Create REST API endpoints for advertisements
    - Create POST /api/ads/zones endpoint (admin only)
    - Create PUT /api/ads/zones/:id endpoint (admin only)
    - Create DELETE /api/ads/zones/:id endpoint (admin only)
    - Create GET /api/ads/zones endpoint
    - Create POST /api/ads/track endpoint
    - Create GET /api/ads/performance/:zoneId endpoint (admin only)
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 10.1, 10.2, 10.5, 10.6, 10.8, 10.11_

- [ ] 13. Implement Analytics Service
  - [ ] 13.1 Create AnalyticsService class
    - Implement trackUserInteraction method for page views and clicks
    - Implement trackSearchQuery method with query details
    - Implement getPopularProducts method with time range filtering
    - Implement getSearchTrends method with aggregation
    - Implement getSystemPerformance method with metrics
    - Implement generateReport method with automated scheduling
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 13.2 Set up analytics data storage
    - Create partitioned tables for analytics data by month
    - Implement data retention policy (keep 12 months)
    - Add indexes for common analytics queries
    - Implement data aggregation for performance
    - _Requirements: 9.1, 9.3_
  
  - [ ] 13.3 Create REST API endpoints for analytics
    - Create POST /api/analytics/track endpoint
    - Create GET /api/analytics/popular-products endpoint (admin only)
    - Create GET /api/analytics/search-trends endpoint (admin only)
    - Create GET /api/analytics/system-performance endpoint (admin only)
    - Create GET /api/analytics/reports endpoint (admin only)
    - Add OpenAPI documentation for all endpoints
    - _Requirements: 9.1, 9.2, 9.4_

- [ ] 14. Build public-facing frontend pages
  - [ ] 14.1 Create homepage with search interface
    - Build responsive homepage layout with Tailwind CSS
    - Implement search bar with autocomplete
    - Add popular keywords display with click tracking
    - Implement category navigation menu with icons
    - Add featured products section
    - Add best deals section
    - Optimize for mobile and tablet (touch-friendly, responsive)
    - Implement lazy loading for images
    - _Requirements: 4.1, 4.5, 8.2, 8.3, 8.4, 8.5, 11.6_
  
  - [ ] 14.2 Implement search functionality on homepage
    - Connect search bar to Search API
    - Implement autocomplete with debouncing (300ms)
    - Add search suggestions dropdown
    - Handle search submission and navigation to results page
    - Track search queries for analytics
    - _Requirements: 4.1, 4.5, 4.6_
  
  - [ ] 14.3 Create search results page
    - Build search results page with product grid/list view toggle
    - Implement search filters sidebar (category, price range, brand)
    - Add sorting dropdown (price low-high, price high-low, relevance, popularity)
    - Implement pagination with page numbers and next/prev buttons
    - Add loading states with skeleton screens
    - Add error handling with user-friendly messages
    - Optimize for mobile responsiveness with collapsible filters
    - _Requirements: 4.2, 4.3, 4.4, 8.2, 8.3_
  
  - [ ] 14.4 Implement SEO optimization for search results
    - Generate meta titles and descriptions dynamically
    - Add structured data markup (JSON-LD) for product listings
    - Implement canonical URLs
    - Add Open Graph tags for social sharing
    - Generate breadcrumb structured data
    - _Requirements: 8.7, 8.9_
  
  - [ ] 14.5 Create product detail page layout
    - Build product detail page with responsive layout
    - Display product images with image gallery and zoom
    - Display product name, brand, model, and specifications
    - Add product description section
    - Implement breadcrumb navigation
    - Optimize for mobile and tablet viewing
    - _Requirements: 5.1, 8.2, 8.3_
  
  - [ ] 14.6 Implement price comparison on product detail page
    - Display price comparison table with multiple sources
    - Show source name, price, availability status
    - Highlight lowest price with visual indicator
    - Add "Buy Now" buttons with affiliate links
    - Implement affiliate link click tracking
    - Display "Price not available" message when data is missing
    - Add last updated timestamp for prices
    - _Requirements: 5.1, 5.4, 5.5, 5.6, 12.5, 12.8_
  
  - [ ] 14.7 Add price history chart to product detail page
    - Implement price history chart using Chart.js or Recharts
    - Display price trends over time (7 days, 30 days, 90 days)
    - Add interactive tooltips for data points
    - Show average price line
    - Optimize chart for mobile viewing
    - _Requirements: 5.2, 5.3_
  
  - [ ] 14.8 Add related products section
    - Display related products based on category
    - Show product images, names, and price ranges
    - Implement horizontal scrolling for mobile
    - Add click tracking for related product clicks
    - _Requirements: 5.1_
  
  - [ ] 14.9 Implement SEO optimization for product pages
    - Generate meta titles and descriptions from product data
    - Add structured data markup (JSON-LD) for Product schema
    - Add schema.org markup for price and availability
    - Implement canonical URLs
    - Add Open Graph tags for social sharing
    - _Requirements: 8.7, 8.9_
  
  - [ ] 14.10 Create category browsing pages
    - Build category landing pages with product listings
    - Implement hierarchical breadcrumb navigation
    - Display subcategories with product counts
    - Add category description and icon
    - Implement category-specific filters and sorting
    - Add pagination for category products
    - Optimize for mobile responsiveness
    - _Requirements: 11.6, 11.7, 11.8, 11.9, 11.13_
  
  - [ ] 14.11 Implement SEO-friendly URLs for categories
    - Generate SEO-friendly URLs (/dien-lanh, /dien-thoai, etc.)
    - Implement dynamic routing in Next.js App Router
    - Add meta tags and descriptions for category pages
    - Generate structured data for category pages
    - _Requirements: 11.10_
  
  - [ ] 14.12 Create article/content pages
    - Build article detail pages with rich text formatting
    - Display article title, content, and images
    - Add related articles section
    - Add social sharing buttons (Facebook, Twitter, Zalo)
    - Optimize for mobile reading experience
    - _Requirements: 7.1, 8.2, 8.3_
  
  - [ ] 14.13 Implement SEO optimization for article pages
    - Generate meta titles and descriptions from article data
    - Add structured data markup (JSON-LD) for Article schema
    - Implement canonical URLs
    - Add Open Graph tags for social sharing
    - _Requirements: 7.3, 8.7, 8.9_

- [ ] 15. Implement advertisement display components
  - [ ] 15.1 Create flexible ad zone components
    - Create AdZone React component with position props
    - Support multiple ad positions (header, footer, sidebar, in-content, overlay, floating)
    - Implement responsive ad sizing for mobile and desktop
    - Add loading states for ad content
    - _Requirements: 10.1, 10.7_
  
  - [ ] 15.2 Implement Google Ads integration
    - Create GoogleAd component with script loading
    - Implement async script loading for Google Ads
    - Add error handling for ad loading failures
    - Ensure ads don't block page rendering
    - _Requirements: 10.3_
  
  - [ ] 15.3 Implement static banner advertisements
    - Create BannerAd component for image advertisements
    - Add image optimization and lazy loading
    - Implement click tracking for banner ads
    - Add responsive image sizing
    - _Requirements: 10.4_
  
  - [ ] 15.4 Implement ad tracking
    - Track ad impressions when ads are visible
    - Track ad clicks with metadata
    - Send tracking data to Analytics API
    - Ensure tracking doesn't interfere with core functionality
    - _Requirements: 10.8, 10.10_

- [ ] 16. Build admin dashboard
  - [ ] 16.1 Create admin dashboard layout
    - Build admin dashboard layout with sidebar navigation
    - Implement authentication-protected routes with middleware
    - Add role-based access control for pages
    - Create dashboard overview with key metrics cards
    - Implement responsive design for tablet access
    - Add logout functionality
    - _Requirements: 1.3, 2.1_
  
  - [ ] 16.2 Create admin user management interface
    - Build user management page for Reviewer accounts
    - Implement user creation form with validation
    - Add user list table with search and filtering
    - Implement user edit modal with permission checkboxes
    - Add user activation/deactivation toggle
    - Add delete confirmation dialog
    - _Requirements: 2.4, 2.5_
  
  - [ ] 16.3 Create admin website configuration interface
    - Build website settings page with tabs
    - Implement logo upload with image preview
    - Add theme customization controls (primary color, secondary color, font)
    - Implement branding text inputs (site name, tagline)
    - Add configuration preview panel
    - Implement save and reset functionality
    - _Requirements: 2.2_
  
  - [ ] 16.4 Create admin advertisement management interface
    - Build advertisement management page with ad zone list
    - Implement ad zone creation form (name, position, dimensions)
    - Add Google Ads code embedding textarea
    - Implement static banner upload with image preview
    - Add ad zone edit and delete functionality
    - Display advertisement performance dashboard with charts
    - Implement A/B testing configuration interface
    - Add advertisement approval workflow
    - _Requirements: 2.3, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.8, 10.11, 10.12_
  
  - [ ] 16.5 Create admin affiliate management interface
    - Build affiliate configuration page with platform list
    - Implement affiliate config creation form
    - Add refer-code input for each platform
    - Implement link template configuration with validation
    - Add campaign management section (create, edit, delete campaigns)
    - Display affiliate performance dashboard with metrics (clicks, conversions, revenue)
    - Implement enable/disable toggle for affiliate programs
    - Add priority ordering drag-and-drop
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.7, 12.9, 12.12, 12.13, 12.14, 12.15_
  
  - [ ] 16.6 Create admin analytics and reporting interface
    - Build analytics dashboard with real-time metrics
    - Display popular products table with sorting
    - Display search trends chart with time range selector
    - Add system performance monitoring charts (response time, error rate, uptime)
    - Implement automated report generation interface
    - Add date range filtering for analytics data
    - Display user behavior analytics (search queries, page views, click-through rates)
    - Add export functionality for reports (CSV, PDF)
    - _Requirements: 2.6, 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 16.7 Create admin category management interface
    - Build category management page with hierarchical tree view
    - Implement category creation form (Vietnamese name, English name, slug, description, icon)
    - Add drag-and-drop for category reordering
    - Implement parent-child relationship dropdown
    - Add category icon upload with preview
    - Display category metrics (product count, popularity, views)
    - Implement category activation/deactivation toggle
    - Add delete confirmation with cascade warning
    - _Requirements: 11.3, 11.4, 11.12_

- [ ] 17. Build reviewer dashboard
  - [ ] 17.1 Create reviewer dashboard layout
    - Build reviewer dashboard layout with sidebar navigation
    - Implement authentication-protected routes with middleware
    - Create dashboard overview with pending articles count
    - Implement responsive design for tablet access
    - Add logout functionality
    - _Requirements: 1.3, 3.1_
  
  - [ ] 17.2 Create AI article generation interface
    - Build article generation page with keyword input form
    - Implement article generation trigger button
    - Add loading state during AI generation
    - Display generated article preview
    - Add error handling for generation failures
    - _Requirements: 3.2, 7.1_
  
  - [ ] 17.3 Create article editor interface
    - Build rich text editor for article editing (TipTap or Quill)
    - Implement article title and content editing
    - Add image upload and management
    - Implement article preview mode
    - Add save draft functionality
    - Add submit for review button
    - _Requirements: 3.3, 7.5_
  
  - [ ] 17.4 Create article approval workflow interface
    - Build pending articles queue with list view
    - Display article status badges (draft, pending, published, rejected)
    - Implement article approval button
    - Implement article rejection with feedback textarea
    - Add article version history viewer
    - Display reviewer information and timestamps
    - _Requirements: 3.4, 3.5, 3.6, 7.6_

- [ ] 18. Implement PWA features and performance optimization
  - [ ] 18.1 Set up PWA with Next-PWA
    - Configure Next-PWA in next.config.js
    - Create service worker for offline support
    - Add web app manifest with icons and theme colors
    - Implement install prompt for mobile users
    - Test PWA installation on mobile devices
    - _Requirements: 8.6_
  
  - [ ] 18.2 Optimize frontend performance
    - Implement image optimization with Next.js Image component
    - Add lazy loading for images and components
    - Implement code splitting with dynamic imports
    - Minimize JavaScript and CSS bundle sizes
    - Add prefetching for critical resources
    - Optimize for mobile networks with compression
    - Implement resource hints (preconnect, dns-prefetch)
    - _Requirements: 8.1, 8.4, 8.10, 8.11_
  
  - [ ] 18.3 Implement SEO optimization
    - Generate XML sitemaps automatically for all public pages
    - Add robots.txt with proper directives
    - Implement canonical URLs for all pages
    - Add proper redirects for moved pages
    - Implement breadcrumb structured data
    - Test SEO with Google Search Console
    - _Requirements: 8.7, 8.8_

- [ ] 19. Implement error handling and monitoring
  - [ ] 19.1 Add comprehensive error handling to backend
    - Implement error handling middleware for Express.js
    - Add custom error classes (ValidationError, NotFoundError, etc.)
    - Implement retry logic with exponential backoff for external services
    - Add circuit breaker pattern for API integrations
    - Implement graceful degradation for service failures
    - Add structured logging with Winston or Pino
    - _Requirements: 5.6, 6.7, 6.8, 6.9_
  
  - [ ] 19.2 Add error handling to frontend
    - Implement error boundaries in React components
    - Add user-friendly error messages for public pages
    - Implement fallback UI for component errors
    - Add error tracking with Sentry or similar
    - Implement retry mechanisms for failed API calls
    - _Requirements: 5.6_
  
  - [ ] 19.3 Set up monitoring and alerting
    - Implement Prometheus metrics collection
    - Set up Grafana dashboards for system monitoring
    - Add health check endpoints for all services
    - Implement uptime monitoring with ping checks
    - Add error rate and performance alerting
    - Configure alert notifications (email, Slack)
    - _Requirements: 9.2, 9.3, 9.5_

- [ ] 20. Testing and quality assurance
  - [ ] 20.1 Write unit tests for backend services
    - Write Jest unit tests for CategoryManagementService
    - Write Jest unit tests for SearchService
    - Write Jest unit tests for PriceComparisonService
    - Write Jest unit tests for AffiliateLinkService
    - Write Jest unit tests for ContentManagementService
    - Write Jest unit tests for AdvertisementService
    - Write Jest unit tests for AnalyticsService
    - Test business logic and data transformations
    - Test error handling scenarios
    - Achieve 80% code coverage minimum
    - _Requirements: All backend service requirements_
  
  - [ ] 20.2 Write integration tests for APIs
    - Write integration tests for category API endpoints
    - Write integration tests for search API endpoints
    - Write integration tests for price comparison API endpoints
    - Write integration tests for affiliate API endpoints
    - Write integration tests for authentication API endpoints
    - Write integration tests for admin API endpoints
    - Write integration tests for advertisement API endpoints
    - Write integration tests for analytics API endpoints
    - Test with PostgreSQL test containers
    - Test Redis integration with test containers
    - Test authentication and authorization flows
    - _Requirements: All API requirements_
  
  - [ ] 20.3 Write integration tests for data collection
    - Write integration tests for API integrator (Tiki, Lazada, TikTok Shop)
    - Write integration tests for web scraper with mock websites
    - Write integration tests for data collection coordinator
    - Test error recovery and retry mechanisms
    - Test data validation and normalization
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.9_
  
  - [ ] 20.4 Write end-to-end tests for frontend
    - Write Playwright tests for homepage and search flow
    - Write Playwright tests for search results and filtering
    - Write Playwright tests for product detail and price comparison
    - Write Playwright tests for category browsing
    - Write Playwright tests for article pages
    - Write Playwright tests for admin dashboard (user management, config, ads, affiliate)
    - Write Playwright tests for reviewer dashboard (article generation, editing, approval)
    - Test mobile responsiveness with device emulation
    - Test advertisement display and tracking
    - Test affiliate link generation and tracking
    - _Requirements: 4.1, 4.2, 5.1, 11.7, 12.5_
  
  - [ ] 20.5 Perform load testing
    - Write Artillery.js load test for concurrent search requests (1000+ users)
    - Write Artillery.js load test for price comparison page loads
    - Write Artillery.js load test for data collection service
    - Write Artillery.js load test for advertisement serving
    - Identify and fix performance bottlenecks
    - Verify page load times under load (< 2 seconds target)
    - _Requirements: 8.1_
  
  - [ ] 20.6 Perform security testing
    - Run OWASP ZAP security scanning
    - Test SQL injection prevention on all endpoints
    - Test XSS prevention on all user inputs
    - Test rate limiting and API abuse prevention
    - Test JWT token security and expiration
    - Verify input validation on all endpoints
    - Test CORS configuration
    - Test HTTPS enforcement
    - _Requirements: 1.1, 1.4, 6.7_

- [ ] 21. Deployment and infrastructure setup
  - [ ] 21.1 Create production Docker containers
    - Optimize Dockerfile for Next.js frontend (multi-stage build)
    - Optimize Dockerfile for Express.js backend (multi-stage build)
    - Create Docker Compose file for production deployment
    - Add environment variable configuration for production
    - Test Docker containers locally
    - _Requirements: 8.1_
  
  - [ ] 21.2 Set up CloudFlare CDN integration
    - Configure CloudFlare account and DNS
    - Set up cache rules for images and static files
    - Configure SSL/TLS settings (Full or Full Strict)
    - Add page rules for caching optimization
    - Test CDN performance and cache hit rates
    - _Requirements: 8.1, 8.4_
  
  - [ ] 21.3 Create deployment scripts and CI/CD pipeline
    - Create deployment scripts for production server
    - Set up CI/CD pipeline (GitHub Actions or GitLab CI)
    - Add automated testing in CI pipeline (unit, integration, E2E)
    - Implement automated deployment to production on main branch
    - Add database migration automation in deployment
    - Add rollback mechanism for failed deployments
    - Configure environment variables in CI/CD
    - _Requirements: 8.1_
  
  - [ ] 21.4 Set up production database and Redis
    - Configure PostgreSQL production instance with read replicas
    - Set up automated database backups (daily)
    - Configure Redis production instance with persistence
    - Set up database monitoring and alerting
    - Test database connection pooling under load
    - _Requirements: 8.1_

- [ ] 22. Final integration and system testing
  - [ ] 22.1 Integrate all components and services
    - Wire frontend to backend APIs with proper error handling
    - Connect data collection services to database
    - Integrate AI content generation with reviewer workflow
    - Connect affiliate link generation to product pages
    - Integrate advertisement display across all pages
    - Test end-to-end flows for all features
    - Verify all caching mechanisms are working
    - _Requirements: All requirements_
  
  - [ ] 22.2 Perform system-wide testing
    - Test all public user flows (search, browse, compare prices)
    - Test all admin flows (user management, config, ads, affiliate, analytics, categories)
    - Test all reviewer flows (article generation, editing, approval)
    - Test mobile and tablet responsiveness on real devices
    - Test PWA installation and offline functionality
    - Test SEO optimization with Google Search Console
    - Verify all analytics tracking is working
    - Test affiliate link generation and tracking
    - _Requirements: All requirements_
  
  - [ ] 22.3 Checkpoint - Ensure all tests pass and system is production-ready
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- The implementation uses TypeScript throughout for type safety
- All services implement proper error handling and logging
- Caching is used extensively for performance optimization (Redis with appropriate TTLs)
- The system is designed for mobile-first responsive experience
- SEO optimization is built into all public pages with structured data markup
- Authentication is only required for Administrator and Reviewer roles
- All public features are accessible without authentication
- Affiliate links are automatically generated with refer-codes for revenue tracking
- The system supports flexible advertisement placements with performance tracking
- Category management supports hierarchical structures with Vietnamese and English names
- Data collection supports both API integration and web scraping with fault tolerance
- AI content generation requires reviewer approval before publication
- PWA features provide offline support and mobile app-like experience
- Comprehensive testing ensures system reliability and security

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3", "1.4"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"]
    },
    {
      "id": 2,
      "tasks": ["3.1", "3.2"]
    },
    {
      "id": 3,
      "tasks": ["4.1", "5.1", "6.1", "10.1"]
    },
    {
      "id": 4,
      "tasks": ["4.2", "4.3", "5.2", "5.3", "6.2", "6.3", "7.1", "10.2", "10.3"]
    },
    {
      "id": 5,
      "tasks": ["5.4", "7.2", "7.3", "7.4", "11.1", "11.2"]
    },
    {
      "id": 6,
      "tasks": ["7.5", "8.1", "8.2", "12.1", "12.2", "13.1", "13.2"]
    },
    {
      "id": 7,
      "tasks": ["8.3", "8.4", "9.1", "9.2", "12.3", "13.3"]
    },
    {
      "id": 8,
      "tasks": ["9.3", "9.4"]
    },
    {
      "id": 9,
      "tasks": ["14.1", "14.2", "14.10", "14.12"]
    },
    {
      "id": 10,
      "tasks": ["14.3", "14.4", "14.5", "14.11", "14.13"]
    },
    {
      "id": 11,
      "tasks": ["14.6", "14.7", "14.8", "14.9"]
    },
    {
      "id": 12,
      "tasks": ["15.1", "15.2", "15.3"]
    },
    {
      "id": 13,
      "tasks": ["15.4"]
    },
    {
      "id": 14,
      "tasks": ["16.1", "17.1"]
    },
    {
      "id": 15,
      "tasks": ["16.2", "16.3", "16.4", "16.5", "16.6", "16.7", "17.2"]
    },
    {
      "id": 16,
      "tasks": ["17.3", "17.4"]
    },
    {
      "id": 17,
      "tasks": ["18.1", "18.2", "18.3"]
    },
    {
      "id": 18,
      "tasks": ["19.1", "19.2", "19.3"]
    },
    {
      "id": 19,
      "tasks": ["20.1", "20.2", "20.3", "20.4", "20.5", "20.6"]
    },
    {
      "id": 20,
      "tasks": ["21.1", "21.2", "21.4"]
    },
    {
      "id": 21,
      "tasks": ["21.3"]
    },
    {
      "id": 22,
      "tasks": ["22.1", "22.2"]
    }
  ]
}
```
