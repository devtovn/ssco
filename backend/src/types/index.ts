// Common types used across the application

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  code?: string;
}

export type UserRole = 'administrator' | 'reviewer';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface CacheConfig {
  key: string;
  ttl: number;
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SEARCH_RESULTS: 300, // 5 minutes
  PRICE_COMPARISON: 3600, // 1 hour
  PRICE_HISTORY: 7200, // 2 hours
  BEST_DEALS: 1800, // 30 minutes
  POPULAR_KEYWORDS: 1800, // 30 minutes
  SEARCH_SUGGESTIONS: 600, // 10 minutes
  CATEGORY_TREE: 3600, // 1 hour
  CATEGORY_PRODUCTS: 600, // 10 minutes
  CATEGORY_METRICS: 1800, // 30 minutes
  AFFILIATE_CONFIGS: 3600, // 1 hour
  AFFILIATE_CONFIG_PLATFORM: 3600, // 1 hour
  AFFILIATE_CAMPAIGNS: 1800, // 30 minutes
  AFFILIATE_PERFORMANCE: 600, // 10 minutes
  AD_ZONE: 600, // 10 minutes
  AD_PERFORMANCE: 300, // 5 minutes
} as const;

// Cache key generators
export const cacheKeys = {
  searchResults: (queryHash: string) => `search:${queryHash}`,
  priceComparison: (productId: string) => `prices:${productId}`,
  priceHistory: (productId: string, days: number) => `prices:history:${productId}:${days}`,
  bestDeals: (category?: string) => `deals:${category || 'all'}`,
  popularKeywords: () => 'popular:keywords',
  searchSuggestions: (partial: string) => `suggestions:${partial}`,
  categoryTree: () => 'categories:tree',
  categoryProducts: (categoryId: string) => `category:${categoryId}:products`,
  categoryMetrics: (categoryId: string) => `category:${categoryId}:metrics`,
  affiliateConfigs: () => 'affiliate:configs:all',
  affiliateConfigPlatform: (platformId: string) => `affiliate:config:${platformId}`,
  affiliateCampaigns: (platformId: string) => `affiliate:campaigns:${platformId}`,
  affiliatePerformance: (platformId: string, dateRange: string) =>
    `affiliate:performance:${platformId}:${dateRange}`,
  adZone: (zoneId: string) => `ads:zone:${zoneId}`,
  adPerformance: (zoneId: string) => `ads:performance:${zoneId}`,
} as const;
