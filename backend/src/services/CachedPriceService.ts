/**
 * Cached Price Service
 * Wraps PriceComparisonService with Redis caching
 */

import {
  PriceComparison,
  PriceHistory,
  Deal,
  PriceUpdateResult,
} from '@kombe/types';
import { priceComparisonService } from './PriceComparisonService';
import { CacheService, CacheKeys, CacheTTL } from '../utils/cache';

export class CachedPriceService {
  /**
   * Get product prices (with caching)
   */
  async getProductPrices(productId: string): Promise<PriceComparison> {
    const cacheKey = CacheKeys.PRODUCT_PRICES(productId);
    
    // Try to get from cache
    const cached = await CacheService.get<PriceComparison>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from database
    const comparison = await priceComparisonService.getProductPrices(productId);
    
    // Store in cache
    await CacheService.set(cacheKey, comparison, CacheTTL.PRODUCT_PRICES);
    
    return comparison;
  }

  /**
   * Get price history (with caching)
   */
  async getPriceHistory(
    productId: string,
    source?: string,
    days: number = 30
  ): Promise<PriceHistory> {
    const cacheKey = `${CacheKeys.PRICE_HISTORY(productId)}:${source || 'all'}:${days}`;
    
    // Try to get from cache
    const cached = await CacheService.get<PriceHistory>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from database
    const history = await priceComparisonService.getPriceHistory(productId, source, days);
    
    // Store in cache
    await CacheService.set(cacheKey, history, CacheTTL.PRICE_HISTORY);
    
    return history;
  }

  /**
   * Get best deals (with caching)
   */
  async getBestDeals(
    categoryId?: number,
    limit: number = 20,
    minDiscountPercent: number = 10
  ): Promise<Deal[]> {
    const cacheKey = `${CacheKeys.BEST_DEALS(categoryId)}:${limit}:${minDiscountPercent}`;
    
    // Try to get from cache
    const cached = await CacheService.get<Deal[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from database
    const deals = await priceComparisonService.getBestDeals(categoryId, limit, minDiscountPercent);
    
    // Store in cache
    await CacheService.set(cacheKey, deals, CacheTTL.BEST_DEALS);
    
    return deals;
  }

  /**
   * Update prices (invalidates cache)
   */
  async updatePrices(
    productId: string,
    prices: Array<{
      source: string;
      sourceUrl: string;
      price: number;
      currency: string;
      isAvailable: boolean;
      metadata?: Record<string, any>;
    }>
  ): Promise<PriceUpdateResult> {
    // Update prices in database
    const result = await priceComparisonService.updatePrices(productId, prices);
    
    // Invalidate caches for this product
    await this.invalidatePriceCache(productId);
    
    return result;
  }

  /**
   * Get price statistics (with caching)
   */
  async getPriceStatistics(productId: string): Promise<{
    currentLowest: number;
    currentHighest: number;
    currentAverage: number;
    historicalLowest: number;
    historicalHighest: number;
    priceVolatility: number;
  }> {
    const cacheKey = `price:stats:${productId}`;
    
    // Try to get from cache
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get from database
    const stats = await priceComparisonService.getPriceStatistics(productId);
    
    // Store in cache (shorter TTL for statistics)
    await CacheService.set(cacheKey, stats, 1800); // 30 minutes
    
    return stats;
  }

  /**
   * Invalidate price cache for a product
   */
  async invalidatePriceCache(productId: string): Promise<void> {
    // Invalidate product prices
    await CacheService.delete(CacheKeys.PRODUCT_PRICES(productId));
    
    // Invalidate price history (all variations)
    await CacheService.deletePattern(`${CacheKeys.PRICE_HISTORY(productId)}:*`);
    
    // Invalidate price statistics
    await CacheService.delete(`price:stats:${productId}`);
    
    // Invalidate best deals (since this product might be in deals)
    await CacheService.deletePattern('deals:*');
  }

  /**
   * Invalidate all price caches
   * Call this when doing bulk price updates
   */
  async invalidateAllPriceCache(): Promise<void> {
    await CacheService.deletePattern('product:*:prices');
    await CacheService.deletePattern('product:*:price_history');
    await CacheService.deletePattern('price:stats:*');
    await CacheService.deletePattern('deals:*');
  }

  /**
   * Warm up price cache
   * Pre-load popular products and best deals
   */
  async warmCache(): Promise<void> {
    
    try {
      // Cache best deals (all categories)
      await this.getBestDeals(undefined, 20, 10);
      
      // Cache best deals for top categories (if we know them)
      const topCategoryIds = [1, 2, 3, 4, 5]; // TODO: Get from analytics
      
      for (const categoryId of topCategoryIds) {
        await this.getBestDeals(categoryId, 20, 10);
      }
      
      // TODO: Cache prices for popular products (from analytics)
    } catch (error) {
      console.error('Failed to warm up price cache:', error);
    }
  }
}

// Export singleton instance
export const cachedPriceService = new CachedPriceService();
