/**
 * Cached Advertisement Service
 * Wraps AdvertisementService with Redis caching
 * Implements caching for ad zone configurations (10 minutes TTL) and ad performance metrics (5 minutes TTL)
 */

import {
  AdvertisementService,
  AdZone,
  AdZoneConfig,
  PlacementConfig,
  Advertisement,
  AdType,
  AdTargeting,
  AdEvent,
  AdMetrics,
  AdPosition,
} from './AdvertisementService';
import { CacheService, CacheKeys, CacheTTL } from '../utils/cache';

export class CachedAdvertisementService {
  constructor(
    private advertisementService: AdvertisementService,
    private cache: typeof CacheService
  ) {}

  /**
   * Create ad zone and invalidate cache
   */
  async createAdZone(config: AdZoneConfig): Promise<AdZone> {
    const zone = await this.advertisementService.createAdZone(config);

    // Invalidate ad zone caches
    await this.invalidateAdZoneCaches();

    return zone;
  }

  /**
   * Update ad placement and invalidate cache
   */
  async updateAdPlacement(zoneId: string, config: PlacementConfig): Promise<AdZone> {
    const zone = await this.advertisementService.updateAdPlacement(zoneId, config);

    // Invalidate specific zone cache and all zones cache
    await this.invalidateAdZoneCaches();
    await this.cache.delete(CacheKeys.AD_ZONE(zoneId));

    return zone;
  }

  /**
   * Track ad performance (no caching - write operation)
   * Invalidates performance cache after tracking
   */
  async trackAdPerformance(adId: string, event: AdEvent): Promise<void> {
    await this.advertisementService.trackAdPerformance(adId, event);

    // We need to get the zone ID to invalidate the right cache
    // For now, invalidate all performance caches
    await this.cache.deletePattern('ads:performance:*');
  }

  /**
   * Get performance metrics with caching (5 minutes TTL)
   */
  async getPerformanceMetrics(zoneId: string, days: number = 30): Promise<AdMetrics> {
    const cacheKey = `${CacheKeys.AD_PERFORMANCE(zoneId)}:${days}`;

    // Try cache first
    const cached = await this.cache.get<AdMetrics>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`Cache MISS: ${cacheKey}`);

    // Cache miss - fetch from service
    const metrics = await this.advertisementService.getPerformanceMetrics(zoneId, days);

    // Store in cache
    await this.cache.set(cacheKey, metrics, CacheTTL.AD_PERFORMANCE);

    return metrics;
  }

  /**
   * Delete ad zone and invalidate cache
   */
  async deleteAdZone(zoneId: string): Promise<void> {
    await this.advertisementService.deleteAdZone(zoneId);

    // Invalidate all ad zone caches
    await this.invalidateAdZoneCaches();
    await this.cache.delete(CacheKeys.AD_ZONE(zoneId));
    await this.cache.delete(CacheKeys.AD_PERFORMANCE(zoneId));
    await this.cache.delete(CacheKeys.AD_ACTIVE_ADS(zoneId));
  }

  /**
   * Create advertisement and invalidate cache
   */
  async createAdvertisement(
    zoneId: string,
    type: AdType,
    contentUrl: string,
    startDate: Date,
    endDate?: Date,
    targeting?: AdTargeting
  ): Promise<Advertisement> {
    const ad = await this.advertisementService.createAdvertisement(
      zoneId,
      type,
      contentUrl,
      startDate,
      endDate,
      targeting
    );

    // Invalidate active ads cache for this zone
    await this.cache.delete(CacheKeys.AD_ACTIVE_ADS(zoneId));

    return ad;
  }

  /**
   * Get ad zones with caching (10 minutes TTL)
   */
  async getAdZones(filters?: { isActive?: boolean; position?: AdPosition }): Promise<AdZone[]> {
    // Generate cache key based on filters
    const filterKey = filters ? JSON.stringify(filters) : 'all';
    const cacheKey = CacheKeys.AD_ZONE_CONFIGS(filterKey);

    // Try cache first
    const cached = await this.cache.get<AdZone[]>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`Cache MISS: ${cacheKey}`);

    // Cache miss - fetch from service
    const zones = await this.advertisementService.getAdZones(filters);

    // Store in cache
    await this.cache.set(cacheKey, zones, CacheTTL.AD_ZONES);

    return zones;
  }

  /**
   * Get ad zone by ID with caching (10 minutes TTL)
   */
  async getAdZoneById(zoneId: string): Promise<AdZone | null> {
    const cacheKey = CacheKeys.AD_ZONE(zoneId);

    // Try cache first
    const cached = await this.cache.get<AdZone>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`Cache MISS: ${cacheKey}`);

    // Cache miss - fetch from service
    const zone = await this.advertisementService.getAdZoneById(zoneId);

    if (zone) {
      // Store in cache
      await this.cache.set(cacheKey, zone, CacheTTL.AD_ZONES);
    }

    return zone;
  }

  /**
   * Get advertisements by zone (no caching - frequently changing data)
   */
  async getAdvertisementsByZone(zoneId: string): Promise<Advertisement[]> {
    return this.advertisementService.getAdvertisementsByZone(zoneId);
  }

  /**
   * Get active advertisements with caching (10 minutes TTL)
   */
  async getActiveAdvertisements(zoneId: string): Promise<Advertisement[]> {
    const cacheKey = CacheKeys.AD_ACTIVE_ADS(zoneId);

    // Try cache first
    const cached = await this.cache.get<Advertisement[]>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    console.log(`Cache MISS: ${cacheKey}`);

    // Cache miss - fetch from service
    const ads = await this.advertisementService.getActiveAdvertisements(zoneId);

    // Store in cache
    await this.cache.set(cacheKey, ads, CacheTTL.AD_ZONES);

    return ads;
  }

  /**
   * Update advertisement and invalidate cache
   */
  async updateAdvertisement(
    adId: string,
    updates: {
      contentUrl?: string;
      targeting?: AdTargeting;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    }
  ): Promise<Advertisement> {
    const ad = await this.advertisementService.updateAdvertisement(adId, updates);

    // Invalidate active ads cache for this zone
    await this.cache.delete(CacheKeys.AD_ACTIVE_ADS(ad.zoneId));

    return ad;
  }

  /**
   * Delete advertisement and invalidate cache
   */
  async deleteAdvertisement(adId: string): Promise<void> {
    // We need to get the zone ID before deleting
    // For now, invalidate all active ads caches
    await this.advertisementService.deleteAdvertisement(adId);
    await this.cache.deletePattern('ads:active:*');
  }

  /**
   * Invalidate all ad zone caches
   */
  private async invalidateAdZoneCaches(): Promise<void> {
    await Promise.all([
      this.cache.deletePattern('ads:zones:*'),
      this.cache.deletePattern('ads:zone:*'),
    ]);
    console.log('Ad zone caches invalidated');
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(): Promise<void> {
    try {
      console.log('Warming up advertisement cache...');

      // Warm up all active ad zones
      const activeZones = await this.advertisementService.getAdZones({ isActive: true });

      // Cache all active zones
      await this.cache.set(
        CacheKeys.AD_ZONE_CONFIGS('{"isActive":true}'),
        activeZones,
        CacheTTL.AD_ZONES
      );

      // Cache each zone individually
      await Promise.all(
        activeZones.map((zone) =>
          this.cache.set(CacheKeys.AD_ZONE(zone.id), zone, CacheTTL.AD_ZONES)
        )
      );

      // Cache active advertisements for each zone
      await Promise.all(
        activeZones.map(async (zone) => {
          const activeAds = await this.advertisementService.getActiveAdvertisements(zone.id);
          await this.cache.set(CacheKeys.AD_ACTIVE_ADS(zone.id), activeAds, CacheTTL.AD_ZONES);
        })
      );

      console.log(`✅ Warmed advertisement cache: ${activeZones.length} zones`);
    } catch (error) {
      console.error('Error warming advertisement cache:', error);
    }
  }

  /**
   * Clear all advertisement caches
   */
  async clearCache(): Promise<void> {
    await this.cache.deletePattern('ads:*');
    console.log('✅ Cleared all advertisement caches');
  }
}
