# Shared Types Package - Usage Examples

This document provides practical examples of how to use the `@price-comparison/types` package in both frontend and backend applications.

## Installation

The package is already installed in both frontend and backend via workspace dependencies:

```json
{
  "dependencies": {
    "@price-comparison/types": "file:../packages/types"
  }
}
```

## Backend Usage Examples

### Example 1: Search Service

```typescript
// backend/src/services/SearchService.ts
import {
  SearchQuery,
  SearchResult,
  Product,
  PopularKeyword,
  PaginatedResponse,
} from '@price-comparison/types';

export class SearchService {
  async searchProducts(query: SearchQuery): Promise<PaginatedResponse<Product>> {
    // Implementation
    const products: Product[] = await this.db.query(/* ... */);
    const total = await this.db.count(/* ... */);

    return {
      data: products,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getPopularKeywords(): Promise<PopularKeyword[]> {
    // Implementation
    return await this.db.query(/* ... */);
  }
}
```

### Example 2: Price Comparison Service

```typescript
// backend/src/services/PriceComparisonService.ts
import {
  PriceComparison,
  PriceEntry,
  PriceHistory,
  Deal,
} from '@price-comparison/types';

export class PriceComparisonService {
  async getProductPrices(productId: string): Promise<PriceComparison> {
    const prices: PriceEntry[] = await this.db.query(/* ... */);
    
    const lowestPrice = prices.reduce((min, p) => 
      p.price < min.price ? p : min
    );
    
    const averagePrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;

    return {
      productId,
      prices,
      lowestPrice,
      averagePrice,
      lastUpdated: new Date(),
    };
  }

  async getPriceHistory(productId: string, days: number): Promise<PriceHistory[]> {
    // Implementation
    return await this.db.query(/* ... */);
  }

  async getBestDeals(category?: string): Promise<Deal[]> {
    // Implementation
    return await this.db.query(/* ... */);
  }
}
```

### Example 3: Category Management Service

```typescript
// backend/src/services/CategoryManagementService.ts
import {
  Category,
  CategoryInput,
  CategoryUpdate,
  CategoryTree,
  CategoryMetrics,
} from '@price-comparison/types';

export class CategoryManagementService {
  async createCategory(input: CategoryInput): Promise<Category> {
    // Validate input
    const category: Category = {
      id: generateId(),
      ...input,
      productCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db.insert(category);
    return category;
  }

  async getCategoryTree(): Promise<CategoryTree> {
    // Build hierarchical tree structure
    const categories = await this.db.query(/* ... */);
    return this.buildTree(categories);
  }

  async getCategoryMetrics(categoryId: string): Promise<CategoryMetrics> {
    // Calculate metrics
    return {
      categoryId,
      totalProducts: await this.countProducts(categoryId),
      totalViews: await this.countViews(categoryId),
      totalSearches: await this.countSearches(categoryId),
      averagePrice: await this.calculateAveragePrice(categoryId),
      popularProducts: await this.getPopularProducts(categoryId),
    };
  }
}
```

### Example 4: Affiliate Link Service

```typescript
// backend/src/services/AffiliateLinkService.ts
import {
  AffiliateConfig,
  AffiliateConfigInput,
  AffiliateLinkFormat,
  AffiliatePerformance,
  ClickMetadata,
} from '@price-comparison/types';

export class AffiliateLinkService {
  async generateAffiliateLink(
    productUrl: string,
    platformId: string,
    campaignId?: string
  ): Promise<string> {
    const config: AffiliateConfig = await this.getConfig(platformId);
    
    if (!config.isEnabled) {
      return productUrl; // Fallback to direct link
    }

    // Parse template and inject refer code
    return this.parseTemplate(config.linkTemplate, {
      base_url: productUrl,
      refer_code: campaignId 
        ? this.getCampaignReferCode(config, campaignId)
        : config.referCode,
      product_id: this.extractProductId(productUrl),
    });
  }

  async trackAffiliateLinkClick(
    linkId: string,
    metadata: ClickMetadata
  ): Promise<void> {
    await this.db.insert({
      linkId,
      ...metadata,
      clickedAt: new Date(),
    });
  }

  async getAffiliatePerformance(
    platformId: string,
    dateRange: DateRange
  ): Promise<AffiliatePerformance> {
    // Calculate performance metrics
    const clicks = await this.countClicks(platformId, dateRange);
    const conversions = await this.countConversions(platformId, dateRange);

    return {
      platformId,
      totalClicks: clicks,
      totalConversions: conversions,
      conversionRate: conversions / clicks,
      estimatedRevenue: await this.calculateRevenue(platformId, dateRange),
      clicksByDate: await this.getClicksByDate(platformId, dateRange),
      topProducts: await this.getTopProducts(platformId, dateRange),
    };
  }
}
```

### Example 5: Express API Routes

```typescript
// backend/src/routes/search.ts
import { Router } from 'express';
import { SearchQuery, SearchResult } from '@price-comparison/types';
import { SearchService } from '../services/SearchService';

const router = Router();
const searchService = new SearchService();

router.get('/search', async (req, res) => {
  const query: SearchQuery = {
    keyword: req.query.keyword as string,
    category: req.query.category as string | undefined,
    priceRange: req.query.minPrice && req.query.maxPrice
      ? {
          min: parseFloat(req.query.minPrice as string),
          max: parseFloat(req.query.maxPrice as string),
        }
      : undefined,
    brand: req.query.brand as string | undefined,
    sortBy: req.query.sortBy as any,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
  };

  const results = await searchService.searchProducts(query);
  res.json(results);
});

export default router;
```

## Frontend Usage Examples

### Example 1: Search Component

```typescript
// frontend/components/SearchBar.tsx
import { useState } from 'react';
import { SearchQuery, SearchSuggestion } from '@price-comparison/types';

export function SearchBar() {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  const handleSearch = async () => {
    const searchQuery: SearchQuery = {
      keyword: query,
      page: 1,
      limit: 20,
    };

    const response = await fetch('/api/search?' + new URLSearchParams({
      keyword: searchQuery.keyword,
      page: searchQuery.page.toString(),
      limit: searchQuery.limit.toString(),
    }));

    const results = await response.json();
    // Handle results
  };

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
      />
      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
```

### Example 2: Product Card Component

```typescript
// frontend/components/ProductCard.tsx
import { Product, PriceEntry } from '@price-comparison/types';

interface ProductCardProps {
  product: Product;
  lowestPrice?: PriceEntry;
}

export function ProductCard({ product, lowestPrice }: ProductCardProps) {
  return (
    <div className="product-card">
      <img src={product.images[0]} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      {lowestPrice && (
        <div className="price">
          <span className="amount">
            {lowestPrice.price.toLocaleString()} {lowestPrice.currency}
          </span>
          <span className="source">at {lowestPrice.sourceName}</span>
        </div>
      )}
      <button>Compare Prices</button>
    </div>
  );
}
```

### Example 3: Price Comparison Component

```typescript
// frontend/components/PriceComparison.tsx
import { useState, useEffect } from 'react';
import { PriceComparison, PriceEntry } from '@price-comparison/types';

interface PriceComparisonProps {
  productId: string;
}

export function PriceComparisonTable({ productId }: PriceComparisonProps) {
  const [comparison, setComparison] = useState<PriceComparison | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/prices`)
      .then(res => res.json())
      .then(data => setComparison(data));
  }, [productId]);

  if (!comparison) return <div>Loading...</div>;

  return (
    <div className="price-comparison">
      <h2>Price Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Store</th>
            <th>Price</th>
            <th>Availability</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {comparison.prices.map((price: PriceEntry) => (
            <tr key={price.id} className={price.id === comparison.lowestPrice.id ? 'lowest' : ''}>
              <td>{price.sourceName}</td>
              <td>{price.price.toLocaleString()} {price.currency}</td>
              <td>{price.isAvailable ? 'In Stock' : 'Out of Stock'}</td>
              <td>
                <a href={price.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Buy Now
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="average-price">
        Average Price: {comparison.averagePrice.toLocaleString()} VND
      </p>
      <p className="last-updated">
        Last Updated: {new Date(comparison.lastUpdated).toLocaleString()}
      </p>
    </div>
  );
}
```

### Example 4: Category Navigation Component

```typescript
// frontend/components/CategoryNav.tsx
import { useState, useEffect } from 'react';
import { CategoryTree, Category } from '@price-comparison/types';

export function CategoryNavigation() {
  const [categoryTree, setCategoryTree] = useState<CategoryTree | null>(null);

  useEffect(() => {
    fetch('/api/categories/tree')
      .then(res => res.json())
      .then(data => setCategoryTree(data));
  }, []);

  const renderCategory = (tree: CategoryTree) => {
    const category: Category = tree.category;
    
    return (
      <li key={category.id}>
        <a href={`/category/${category.slug}`}>
          {category.icon && <img src={category.icon} alt="" />}
          <span>{category.nameVi}</span>
          <span className="count">({category.productCount})</span>
        </a>
        {tree.children.length > 0 && (
          <ul className="subcategories">
            {tree.children.map(child => renderCategory(child))}
          </ul>
        )}
      </li>
    );
  };

  if (!categoryTree) return <div>Loading...</div>;

  return (
    <nav className="category-nav">
      <ul>{renderCategory(categoryTree)}</ul>
    </nav>
  );
}
```

### Example 5: Zustand Store with Types

```typescript
// frontend/lib/store/useSearchStore.ts
import { create } from 'zustand';
import { SearchQuery, SearchResult, Product } from '@price-comparison/types';

interface SearchState {
  query: SearchQuery;
  results: Product[];
  total: number;
  isLoading: boolean;
  error: string | null;
  
  setQuery: (query: Partial<SearchQuery>) => void;
  search: () => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: {
    keyword: '',
    page: 1,
    limit: 20,
  },
  results: [],
  total: 0,
  isLoading: false,
  error: null,

  setQuery: (partialQuery) => {
    set((state) => ({
      query: { ...state.query, ...partialQuery },
    }));
  },

  search: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { query } = get();
      const params = new URLSearchParams({
        keyword: query.keyword,
        page: query.page.toString(),
        limit: query.limit.toString(),
      });

      if (query.category) params.append('category', query.category);
      if (query.brand) params.append('brand', query.brand);
      if (query.sortBy) params.append('sortBy', query.sortBy);

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      set({
        results: data.data,
        total: data.pagination.total,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isLoading: false,
      });
    }
  },

  clearResults: () => {
    set({ results: [], total: 0, error: null });
  },
}));
```

## Type Guards and Validation

### Example: Runtime Type Validation with Zod

```typescript
// backend/src/validation/searchValidation.ts
import { z } from 'zod';
import { SearchQuery } from '@price-comparison/types';

// Create Zod schema that matches the TypeScript interface
export const searchQuerySchema = z.object({
  keyword: z.string().min(1).max(200),
  category: z.string().optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  brand: z.string().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'name', 'popularity']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Type guard function
export function isValidSearchQuery(data: unknown): data is SearchQuery {
  return searchQuerySchema.safeParse(data).success;
}

// Validation middleware
export function validateSearchQuery(req: Request, res: Response, next: NextFunction) {
  const result = searchQuerySchema.safeParse(req.query);
  
  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid search query',
      errors: result.error.errors,
    });
  }
  
  req.validatedQuery = result.data;
  next();
}
```

## Best Practices

### 1. Always Import from the Package
```typescript
// ✅ Good
import { Product, Category } from '@price-comparison/types';

// ❌ Bad - Don't create duplicate local types
interface Product {
  // ...
}
```

### 2. Use Type Inference When Possible
```typescript
// ✅ Good - Let TypeScript infer the return type
async function getProduct(id: string) {
  const product: Product = await db.query(/* ... */);
  return product; // Return type is inferred as Product
}

// ❌ Unnecessary - Explicit return type when it can be inferred
async function getProduct(id: string): Promise<Product> {
  // ...
}
```

### 3. Extend Types When Needed
```typescript
// ✅ Good - Extend shared types for specific use cases
import { Product } from '@price-comparison/types';

interface ProductWithPrices extends Product {
  prices: PriceEntry[];
  lowestPrice: PriceEntry;
}
```

### 4. Use Utility Types
```typescript
import { Product, Category } from '@price-comparison/types';

// Partial for updates
type ProductUpdate = Partial<Product>;

// Pick for specific fields
type ProductSummary = Pick<Product, 'id' | 'name' | 'images'>;

// Omit for excluding fields
type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
```

## Troubleshooting

### Issue: Types not found
**Solution**: Rebuild the types package
```bash
npm run build:types
```

### Issue: Type changes not reflected
**Solution**: Clear cache and rebuild
```bash
cd packages/types
npm run clean
npm run build
```

### Issue: Import errors in IDE
**Solution**: Restart TypeScript server in your IDE
- VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Zod Documentation](https://zod.dev/)
- [tsup Documentation](https://tsup.egoist.dev/)
