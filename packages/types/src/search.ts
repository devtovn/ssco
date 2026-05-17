/**
 * Search domain types
 */

import { PaginationParams } from './common';
import { PriceRange } from './price';

export type SortBy = 'relevance' | 'price_asc' | 'price_desc' | 'popularity' | 'newest';

export interface SearchQuery extends PaginationParams {
  keyword: string;
  categoryId?: number;
  priceRange?: PriceRange;
  brand?: string;
  sortBy?: SortBy;
}

export interface SearchResult {
  id: number;
  name: string;
  description?: string;
  categoryId: number;
  categoryName: string;
  brand?: string;
  images: string[];
  priceRange: PriceRange;
  lowestPrice?: number;
  averagePrice?: number;
  source?: string;
  sourceUrl?: string;
  relevanceScore?: number;
  isAvailable: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    categories: Array<{ id: number; name: string; count: number }>;
    brands: Array<{ name: string; count: number }>;
    priceRange: PriceRange;
  };
  searchTime: number; // milliseconds
}

export interface PopularKeyword {
  keyword: string;
  searchCount: number;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  lastSearchedAt: Date;
}

export interface SearchSuggestion {
  text: string;
  type: 'keyword' | 'product' | 'category' | 'brand';
  score: number;
  metadata?: {
    productId?: number;
    categoryId?: number;
    count?: number;
  };
}

export interface SearchLog {
  id: number;
  query: string;
  categoryId?: number;
  filters?: Record<string, any>;
  resultsCount: number;
  searchedAt: Date;
  userSession: string;
  userAgent: string;
  responseTime: number; // milliseconds
}
