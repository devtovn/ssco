/**
 * Cached Search Service
 * Wraps SearchService with Redis caching
 */

import {
  SearchQuery,
  SearchResponse,
  SearchSuggestion,
  PopularKeyword,
} from '@price-comparison/types';
import { searchService } from './SearchService';
import { CacheService, CacheKeys, CacheTTL } from '../utils/cache';
import { hashQuery } from '../utils/hashQuery';

export class CachedSearchService {
  /**
   * Search products (with caching)
   */
  async searchProducts(query: SearchQuery): Promise<SearchResponse> {
    // Generate cache key from query parameters
    const queryHash = hashQuery({
      keyword: query.keyword,
      categoryId: query.categoryId,
      priceRange: query.priceRange,
      brand: query.brand,
      sortBy: query.sortBy,
      page: query.page,
      limit: query.limit,
    });
    
    const cacheKey = CacheKeys.SEARCH_RESULTS(queryHash);
    
    // Try to get from cache
    const cached = await CacheService.get<SearchResponse>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const response = await searchService.searchProducts(query);
    
    // Store in cache
    await CacheService.set(cacheKey, response, CacheTTL.SEARCH_RESULTS);
    
    return response;
  }

  /**
   * Get search suggestions (with caching)
   */
  async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const cacheKey = CacheKeys.SEARCH_SUGGESTIONS(query.trim().toLowerCase());
    
    // Try to get from cache
    const cached = await CacheService.get<SearchSuggestion[]>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const suggestions = await searchService.getSuggestions(query, limit);
    
    // Store in cache
    await CacheService.set(cacheKey, suggestions, CacheTTL.SEARCH_SUGGESTIONS);
    
    return suggestions;
  }

  /**
   * Get popular keywords (with caching)
   */
  async getPopularKeywords(limit: number = 10): Promise<PopularKeyword[]> {
    const cacheKey = `${CacheKeys.POPULAR_KEYWORDS}:${limit}`;
    
    // Try to get from cache
    const cached = await CacheService.get<PopularKeyword[]>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const keywords = await searchService.getPopularKeywords(limit);
    
    // Store in cache
    await CacheService.set(cacheKey, keywords, CacheTTL.POPULAR_KEYWORDS);
    
    return keywords;
  }

  /**
   * Track search query (no caching)
   */
  async trackSearch(query: SearchQuery, resultsCount: number, responseTime: number): Promise<void> {
    // Tracking doesn't need caching
    await searchService.trackSearch(query, resultsCount, responseTime);
    
    // Invalidate popular keywords cache since new search was tracked
    await CacheService.deletePattern(`${CacheKeys.POPULAR_KEYWORDS}:*`);
  }

  /**
   * Invalidate search caches
   * Call this when products are updated
   */
  async invalidateSearchCache(): Promise<void> {
    await CacheService.deletePattern('search:*');
    console.log('Search cache invalidated');
  }

  /**
   * Warm up search cache
   * Pre-load popular searches
   */
  async warmCache(): Promise<void> {
    console.log('Warming up search cache...');
    
    try {
      // Cache popular keywords
      await this.getPopularKeywords(10);
      await this.getPopularKeywords(20);
      
      // Cache common search queries (if we have them)
      const popularKeywords = await searchService.getPopularKeywords(5);
      
      for (const keyword of popularKeywords) {
        // Cache search results for popular keywords
        await this.searchProducts({
          keyword: keyword.keyword,
          page: 1,
          limit: 20,
        });
        
        // Cache suggestions
        await this.getSuggestions(keyword.keyword, 10);
      }
      
      console.log('Search cache warmed up successfully');
    } catch (error) {
      console.error('Failed to warm up search cache:', error);
    }
  }
}

// Export singleton instance
export const cachedSearchService = new CachedSearchService();
