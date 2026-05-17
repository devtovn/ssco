# Routes

This directory contains Express route handlers for the Product Price Comparison Website API.

## Structure

Routes are organized by API endpoint:

- **searchRoutes**: `/api/search` - Product search endpoints
- **productRoutes**: `/api/products` - Product information and price comparison
- **categoryRoutes**: `/api/categories` - Category management
- **authRoutes**: `/api/auth` - Authentication endpoints
- **adminRoutes**: `/api/admin` - Administrative operations
- **contentRoutes**: `/api/content` - Content management
- **adRoutes**: `/api/ads` - Advertisement management
- **affiliateRoutes**: `/api/affiliate` - Affiliate link management
- **analyticsRoutes**: `/api/analytics` - Analytics and reporting

## Guidelines

- Routes should handle HTTP concerns (request/response)
- Routes should delegate business logic to services
- Routes should use validation middleware for request validation
- Routes should use authentication/authorization middleware where needed
- Routes should include OpenAPI/Swagger documentation comments
- Routes should handle errors by passing them to error handling middleware
