import { redisClient } from '../config/redis';

/**
 * Cache key prefixes for different data types
 */
export const CacheKeys = {
  // Category caching
  CATEGORY_TREE: 'category:tree',
  CATEGORY_PRODUCTS: (categoryId: number) => `category:${categoryId}:products`,
  CATEGORY_METRICS: (categoryId: number) => `category:${categoryId}:metrics`,

  // Search caching
  SEARCH_RESULTS: (queryHash: string) => `search:results:${queryHash}`,
  SEARCH_SUGGESTIONS: (query: string) => `search:suggestions:${query}`,
  POPULAR_KEYWORDS: 'search:popular_keywords',

  // Price caching
  PRODUCT_PRICES: (productId: number) => `product:${productId}:prices`,
  PRICE_HISTORY: (productId: number) => `product:${productId}:price_history`,
  BEST_DEALS: (categoryId?: number) =>
    categoryId ? `deals:category:${categoryId}` : 'deals:all',

  // Affiliate caching
  AFFILIATE_CONFIGS: 'affiliate:configs',
  AFFILIATE_CONFIG_PLATFORM: (platformId: string) => `affiliate:config:platform:${platformId}`,
  AFFILIATE_CAMPAIGNS: (platformId: string) => `affiliate:campaigns:${platformId}`,
  AFFILIATE_PERFORMANCE: (platformId: string, dateRange: string) => `affiliate:performance:${platformId}:${dateRange}`,

  // Advertisement caching
  AD_ZONES: 'ads:zones:all',
  AD_ZONE: (zoneId: number) => `ads:zone:${zoneId}`,
  AD_PERFORMANCE: (zoneId: number) => `ads:performance:${zoneId}`,

  // Authentication caching
  REFRESH_TOKEN: (userId: number) => `auth:refresh_token:${userId}`,
  USER_SESSION: (sessionId: string) => `auth:session:${sessionId}`,
} as const;

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CacheTTL = {
  // Category TTLs
  CATEGORY_TREE: 3600, // 1 hour
  CATEGORY_PRODUCTS: 600, // 10 minutes
  CATEGORY_METRICS: 1800, // 30 minutes

  // Search TTLs
  SEARCH_RESULTS: 300, // 5 minutes
  SEARCH_SUGGESTIONS: 600, // 10 minutes
  POPULAR_KEYWORDS: 1800, // 30 minutes

  // Price TTLs
  PRODUCT_PRICES: 3600, // 1 hour
  PRICE_HISTORY: 7200, // 2 hours
  BEST_DEALS: 1800, // 30 minutes

  // Affiliate TTLs
  AFFILIATE_CONFIGS: 3600, // 1 hour
  AFFILIATE_CAMPAIGNS: 1800, // 30 minutes
  AFFILIATE_PERFORMANCE: 600, // 10 minutes

  // Advertisement TTLs
  AD_ZONES: 600, // 10 minutes
  AD_PERFORMANCE: 300, // 5 minutes

  // Authentication TTLs
  REFRESH_TOKEN: 604800, // 7 days
  USER_SESSION: 86400, // 24 hours
} as const;

/**
 * Cache utility class for Redis operations
 */
export class CacheService {
  /**
   * Get a value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  static async set(key: string, value: unknown, ttl: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a specific key from cache
   */
  static async delete(key: string): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;
      await redisClient.del(keys);
      return keys.length;
    } catch (error) {
      console.error(`Cache delete pattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter in cache
   */
  static async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await redisClient.incrBy(key, amount);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set multiple values at once
   */
  static async setMultiple(entries: Array<{ key: string; value: unknown; ttl: number }>): Promise<boolean> {
    try {
      const pipeline = redisClient.multi();
      for (const entry of entries) {
        const serialized = JSON.stringify(entry.value);
        pipeline.setEx(entry.key, entry.ttl, serialized);
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache setMultiple error:', error);
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  static async getMultiple<T>(keys: string[]): Promise<Array<T | null>> {
    try {
      const values = await redisClient.mGet(keys);
      return values.map((value) => (value ? (JSON.parse(value) as T) : null));
    } catch (error) {
      console.error('Cache getMultiple error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmCache(): Promise<void> {
    console.log('Starting cache warming...');
    try {
      // This will be implemented when services are ready
      // For now, just log that warming is available
      console.log('Cache warming completed (no data to warm yet)');
    } catch (error) {
      console.error('Cache warming error:', error);
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  static async clearAll(): Promise<boolean> {
    try {
      await redisClient.flushDb();
      console.log('All cache cleared');
      return true;
    } catch (error) {
      console.error('Cache clear all error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    keys: number;
    memory: string;
    hits: string;
    misses: string;
  }> {
    try {
      const info = await redisClient.info('stats');
      const memory = await redisClient.info('memory');

      // Parse info strings
      const parseInfo = (infoStr: string, key: string): string => {
        const match = infoStr.match(new RegExp(`${key}:(.+)`));
        return match ? match[1].trim() : '0';
      };

      const keys = await redisClient.dbSize();

      return {
        keys,
        memory: parseInfo(memory, 'used_memory_human'),
        hits: parseInfo(info, 'keyspace_hits'),
        misses: parseInfo(info, 'keyspace_misses'),
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        keys: 0,
        memory: '0B',
        hits: '0',
        misses: '0',
      };
    }
  }
}
