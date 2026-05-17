# @price-comparison/types

Shared TypeScript types and interfaces for the Product Price Comparison Website monorepo.

## Overview

This package contains all shared TypeScript type definitions used across the frontend and backend applications. It ensures type consistency and enables type-safe communication between different parts of the system.

## Installation

This package is automatically linked in the monorepo workspace. Both frontend and backend projects reference it via:

```json
{
  "dependencies": {
    "@price-comparison/types": "file:../packages/types"
  }
}
```

## Usage

Import types in your TypeScript files:

```typescript
import { Product, Category, SearchQuery, PriceComparison } from '@price-comparison/types';

// Use the types
const product: Product = {
  id: '123',
  name: 'iPhone 15 Pro',
  category: 'dien-thoai',
  // ...
};
```

## Type Modules

### Product Types (`product.ts`)
- `Product` - Core product entity
- `ProductInput` - Product creation payload
- `ProductUpdate` - Product update payload
- `ProductPerformance` - Product performance metrics

### Category Types (`category.ts`)
- `Category` - Category entity with hierarchical structure
- `CategoryInput` - Category creation payload
- `CategoryUpdate` - Category update payload
- `CategoryTree` - Hierarchical category tree structure
- `CategoryMetrics` - Category analytics metrics

### Price Types (`price.ts`)
- `PriceEntry` - Individual price from a source
- `PriceComparison` - Multi-source price comparison
- `PriceHistory` - Historical price data
- `PriceRange` - Min/max price range
- `Deal` - Special deal/discount information

### Search Types (`search.ts`)
- `SearchQuery` - Search request parameters
- `SearchResult` - Search result item
- `PopularKeyword` - Trending search keyword
- `SearchSuggestion` - Autocomplete suggestion

### Affiliate Types (`affiliate.ts`)
- `AffiliateConfig` - Affiliate program configuration
- `AffiliateLinkFormat` - Link format specification
- `CampaignConfig` - Campaign tracking configuration
- `AffiliatePerformance` - Affiliate performance metrics
- `ClickMetadata` - Click tracking metadata

### User Types (`user.ts`)
- `User` - User entity (Administrator/Reviewer)
- `UserInput` - User creation payload
- `LoginCredentials` - Login request
- `AuthTokens` - JWT authentication tokens
- `JWTPayload` - JWT token payload

### Content Types (`content.ts`)
- `Article` - Content article entity
- `ArticleInput` - Article creation payload
- `SEOMetadata` - SEO optimization metadata
- `GeneratedArticle` - AI-generated article
- `ArticleReview` - Article review workflow

### Advertisement Types (`advertisement.ts`)
- `AdZone` - Advertisement zone configuration
- `Advertisement` - Advertisement entity
- `AdMetrics` - Advertisement performance metrics
- `AdEvent` - Advertisement tracking event

### Analytics Types (`analytics.ts`)
- `UserInteraction` - User interaction tracking
- `SearchLog` - Search query logging
- `PopularProduct` - Popular product metrics
- `SearchTrend` - Search trend analysis
- `SystemPerformance` - System performance metrics
- `AnalyticsReport` - Generated analytics report

### Common Types (`common.ts`)
- `PaginationParams` - Pagination parameters
- `PaginatedResponse<T>` - Paginated API response
- `DateRange` - Date range specification
- `ValidationResult` - Validation result
- `SortOption` - Sorting configuration

## Development

### Build the package

```bash
npm run build
```

This compiles TypeScript to JavaScript and generates type declaration files in the `dist/` directory.

### Watch mode for development

```bash
npm run dev
```

This watches for changes and rebuilds automatically.

### Type checking

```bash
npm run lint
```

This runs TypeScript compiler in type-check mode without emitting files.

### Clean build artifacts

```bash
npm run clean
```

## Build Output

The package is built using `tsup` and generates:
- `dist/index.js` - CommonJS bundle
- `dist/index.mjs` - ES Module bundle
- `dist/index.d.ts` - TypeScript declarations for CommonJS
- `dist/index.d.mts` - TypeScript declarations for ES Modules

## Dependencies

- **zod** (^3.22.4) - Runtime validation schemas (used alongside TypeScript types)
- **typescript** (^5.3.3) - TypeScript compiler
- **tsup** (^8.0.1) - Build tool for TypeScript libraries

## Requirements Mapping

This package satisfies the following requirements:
- **Requirement 4.1**: Type definitions for public product search
- **Requirement 5.1**: Type definitions for price comparison
- **Requirement 11.1**: Type definitions for category management
- **Requirement 12.1**: Type definitions for affiliate link management

## Version

Current version: 1.0.0

## License

MIT
