import { AffiliateLinkService, AffiliateConfig, AffiliateConfigInput, AffiliateConfigUpdate, AffiliatePerformance, ClickMetadata, DateRange } from './AffiliateLinkService';
import { CacheService, CacheKeys, CacheTTL } from '../utils/cache';

/**
 * Cached wrapper for AffiliateLinkService
 * Implements Redis caching for affiliate operations
 */
export class CachedAffiliateLinkService {
  constructor(
    private affiliateService: AffiliateLinkService,
    private cache: typeof CacheService
  ) {}

  /**
   * Get all affiliate configs with caching (1 hour TTL)
   */
  async getAffiliateConfigs(filters?: {
    isEnabled?: boolean;
    platformIds?: string[];
  }): Promise<AffiliateConfig[]> {
    // Generate cache key based on filters
    const filterKey = filters 
      ? JSON.stringify(filters)
      : 'all';
    const cacheKey = `${CacheKeys.AFFILIATE_CONFIGS}:${filterKey}`;

    // Try cache first
    const cached = await this.cache.get<AffiliateConfig[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from service
    const configs = await this.affiliateService.getAffiliateConfigs(filters);

    // Store in cache
    await this.cache.set(cacheKey, configs, CacheTTL.AFFILIATE_CONFIGS);

    return configs;
  }

  /**
   * Get affiliate config by platform with caching (1 hour TTL)
   */
  async getAffiliateConfigByPlatform(platformId: string): Promise<AffiliateConfig | null> {
    const cacheKey = CacheKeys.AFFILIATE_CONFIG_PLATFORM(platformId);

    // Try cache first
    const cached = await this.cache.get<AffiliateConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from service
    const config = await this.affiliateService.getAffiliateConfigByPlatform(platformId);

    if (config) {
      // Store in cache
      await this.cache.set(cacheKey, config, CacheTTL.AFFILIATE_CONFIGS);
    }

    return config;
  }

  /**
   * Create affiliate config and invalidate cache
   */
  async createAffiliateConfig(input: AffiliateConfigInput): Promise<AffiliateConfig> {
    const config = await this.affiliateService.createAffiliateConfig(input);

    // Invalidate all affiliate config caches
    await this.invalidateAffiliateConfigCaches();

    return config;
  }

  /**
   * Update affiliate config and invalidate cache
   */
  async updateAffiliateConfig(
    platformId: string,
    updates: AffiliateConfigUpdate
  ): Promise<AffiliateConfig> {
    const config = await this.affiliateService.updateAffiliateConfig(platformId, updates);

    // Invalidate all affiliate config caches
    await this.invalidateAffiliateConfigCaches();

    return config;
  }

  /**
   * Delete affiliate config and invalidate cache
   */
  async deleteAffiliateConfig(platformId: string): Promise<void> {
    await this.affiliateService.deleteAffiliateConfig(platformId);

    // Invalidate all affiliate config caches
    await this.invalidateAffiliateConfigCaches();
  }

  /**
   * Generate affiliate link (no caching - dynamic operation)
   */
  async generateAffiliateLink(
    productUrl: string,
    platformId: string,
    campaignId?: string
  ): Promise<string> {
    // Link generation is dynamic and depends on current config
    // We use cached config lookup internally
    return this.affiliateService.generateAffiliateLink(productUrl, platformId, campaignId);
  }

  /**
   * Track affiliate link click (no caching - write operation)
   */
  async trackAffiliateLinkClick(
    platformId: string,
    generatedLink: string,
    metadata: ClickMetadata
  ): Promise<string> {
    const clickId = await this.affiliateService.trackAffiliateLinkClick(
      platformId,
      generatedLink,
      metadata
    );

    // Invalidate performance caches for this platform
    await this.invalidatePerformanceCaches(platformId);

    return clickId;
  }

  /**
   * Record conversion (no caching - write operation)
   */
  async recordConversion(clickId: string, conversionValue: number): Promise<void> {
    await this.affiliateService.recordConversion(clickId, conversionValue);

    // Invalidate all performance caches (we don't know which platform)
    await this.cache.deletePattern('affiliate:performance:*');
  }

  /**
   * Get affiliate performance with caching (10 minutes TTL)
   */
  async getAffiliatePerformance(
    platformId: string,
    dateRange: DateRange
  ): Promise<AffiliatePerformance> {
    // Generate cache key with date range
    const dateKey = `${dateRange.startDate.toISOString()}_${dateRange.endDate.toISOString()}`;
    const cacheKey = CacheKeys.AFFILIATE_PERFORMANCE(platformId, dateKey);

    // Try cache first
    const cached = await this.cache.get<AffiliatePerformance>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from service
    const performance = await this.affiliateService.getAffiliatePerformance(
      platformId,
      dateRange
    );

    // Store in cache
    await this.cache.set(cacheKey, performance, CacheTTL.AFFILIATE_PERFORMANCE);

    return performance;
  }

  /**
   * Get campaign performance with caching (10 minutes TTL)
   */
  async getCampaignPerformance(
    platformId: string,
    campaignId: string,
    dateRange: DateRange
  ): Promise<AffiliatePerformance> {
    // Generate cache key with campaign and date range
    const dateKey = `${dateRange.startDate.toISOString()}_${dateRange.endDate.toISOString()}`;
    const cacheKey = `${CacheKeys.AFFILIATE_PERFORMANCE(platformId, dateKey)}:campaign:${campaignId}`;

    // Try cache first
    const cached = await this.cache.get<AffiliatePerformance>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from service
    const performance = await this.affiliateService.getCampaignPerformance(
      platformId,
      campaignId,
      dateRange
    );

    // Store in cache
    await this.cache.set(cacheKey, performance, CacheTTL.AFFILIATE_PERFORMANCE);

    return performance;
  }

  /**
   * Get all platforms performance with caching (10 minutes TTL)
   */
  async getAllPlatformsPerformance(dateRange: DateRange): Promise<AffiliatePerformance[]> {
    // Generate cache key with date range
    const dateKey = `${dateRange.startDate.toISOString()}_${dateRange.endDate.toISOString()}`;
    const cacheKey = `affiliate:performance:all:${dateKey}`;

    // Try cache first
    const cached = await this.cache.get<AffiliatePerformance[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from service
    const performances = await this.affiliateService.getAllPlatformsPerformance(dateRange);

    // Store in cache
    await this.cache.set(cacheKey, performances, CacheTTL.AFFILIATE_PERFORMANCE);

    return performances;
  }

  /**
   * Invalidate all affiliate config caches
   */
  private async invalidateAffiliateConfigCaches(): Promise<void> {
    await Promise.all([
      this.cache.deletePattern('affiliate:configs:*'),
      this.cache.deletePattern('affiliate:config:platform:*'),
    ]);
  }

  /**
   * Invalidate performance caches for a specific platform
   */
  private async invalidatePerformanceCaches(platformId: string): Promise<void> {
    await Promise.all([
      this.cache.deletePattern(`affiliate:performance:${platformId}:*`),
      this.cache.deletePattern('affiliate:performance:all:*'),
    ]);
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(): Promise<void> {
    try {
      // Warm up all enabled affiliate configs
      const configs = await this.affiliateService.getAffiliateConfigs({ isEnabled: true });
      
      // Cache all configs
      await this.cache.set(
        `${CacheKeys.AFFILIATE_CONFIGS}:all`,
        configs,
        CacheTTL.AFFILIATE_CONFIGS
      );

      // Cache each config by platform
      await Promise.all(
        configs.map((config) =>
          this.cache.set(
            CacheKeys.AFFILIATE_CONFIG_PLATFORM(config.platformId),
            config,
            CacheTTL.AFFILIATE_CONFIGS
          )
        )
      );

      console.log(`✅ Warmed affiliate cache: ${configs.length} configs`);
    } catch (error) {
      console.error('Error warming affiliate cache:', error);
    }
  }

  /**
   * Clear all affiliate caches
   */
  async clearCache(): Promise<void> {
    await this.cache.deletePattern('affiliate:*');
    console.log('✅ Cleared all affiliate caches');
  }
}
