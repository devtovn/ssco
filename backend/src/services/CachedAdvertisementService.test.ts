/**
 * Tests for CachedAdvertisementService
 * Verifies caching behavior for advertisement operations
 */

import { CachedAdvertisementService } from './CachedAdvertisementService';
import { AdvertisementService, AdZone, AdZoneConfig, AdMetrics, Advertisement } from './AdvertisementService';
import { CacheService } from '../utils/cache';

// Mock the dependencies
jest.mock('../utils/cache');
jest.mock('./AdvertisementService');

describe('CachedAdvertisementService', () => {
  let cachedService: CachedAdvertisementService;
  let mockAdvertisementService: jest.Mocked<AdvertisementService>;
  let mockCacheService: jest.Mocked<typeof CacheService>;

  const mockAdZone: AdZone = {
    id: 'zone-1',
    name: 'Header Banner',
    position: 'header',
    dimensions: { width: 728, height: 90, unit: 'px' },
    configuration: {},
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockAdMetrics: AdMetrics = {
    zoneId: 'zone-1',
    zoneName: 'Header Banner',
    totalImpressions: 1000,
    totalClicks: 50,
    ctr: 5.0,
    averageImpressions: 500,
    averageClicks: 25,
    performanceByDate: [],
    performanceByAd: [],
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockAdvertisementService = {
      createAdZone: jest.fn(),
      updateAdPlacement: jest.fn(),
      trackAdPerformance: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      deleteAdZone: jest.fn(),
      createAdvertisement: jest.fn(),
      getAdZones: jest.fn(),
      getAdZoneById: jest.fn(),
      getAdvertisementsByZone: jest.fn(),
      getActiveAdvertisements: jest.fn(),
      updateAdvertisement: jest.fn(),
      deleteAdvertisement: jest.fn(),
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deletePattern: jest.fn(),
    } as any;

    cachedService = new CachedAdvertisementService(mockAdvertisementService, mockCacheService);
  });

  describe('getAdZones', () => {
    it('should return cached ad zones on cache hit', async () => {
      const mockZones = [mockAdZone];
      mockCacheService.get.mockResolvedValue(mockZones);

      const result = await cachedService.getAdZones({ isActive: true });

      expect(result).toEqual(mockZones);
      expect(mockCacheService.get).toHaveBeenCalledWith('ads:zone:configs:{"isActive":true}');
      expect(mockAdvertisementService.getAdZones).not.toHaveBeenCalled();
    });

    it('should fetch from service and cache on cache miss', async () => {
      const mockZones = [mockAdZone];
      mockCacheService.get.mockResolvedValue(null);
      mockAdvertisementService.getAdZones.mockResolvedValue(mockZones);

      const result = await cachedService.getAdZones({ isActive: true });

      expect(result).toEqual(mockZones);
      expect(mockCacheService.get).toHaveBeenCalledWith('ads:zone:configs:{"isActive":true}');
      expect(mockAdvertisementService.getAdZones).toHaveBeenCalledWith({ isActive: true });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'ads:zone:configs:{"isActive":true}',
        mockZones,
        600 // AD_ZONES TTL
      );
    });

    it('should use "all" as filter key when no filters provided', async () => {
      const mockZones = [mockAdZone];
      mockCacheService.get.mockResolvedValue(null);
      mockAdvertisementService.getAdZones.mockResolvedValue(mockZones);

      await cachedService.getAdZones();

      expect(mockCacheService.get).toHaveBeenCalledWith('ads:zone:configs:all');
    });
  });

  describe('getAdZoneById', () => {
    it('should return cached ad zone on cache hit', async () => {
      mockCacheService.get.mockResolvedValue(mockAdZone);

      const result = await cachedService.getAdZoneById('zone-1');

      expect(result).toEqual(mockAdZone);
      expect(mockCacheService.get).toHaveBeenCalledWith('ads:zone:zone-1');
      expect(mockAdvertisementService.getAdZoneById).not.toHaveBeenCalled();
    });

    it('should fetch from service and cache on cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAdvertisementService.getAdZoneById.mockResolvedValue(mockAdZone);

      const result = await cachedService.getAdZoneById('zone-1');

      expect(result).toEqual(mockAdZone);
      expect(mockAdvertisementService.getAdZoneById).toHaveBeenCalledWith('zone-1');
      expect(mockCacheService.set).toHaveBeenCalledWith('ads:zone:zone-1', mockAdZone, 600);
    });

    it('should not cache when zone is not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAdvertisementService.getAdZoneById.mockResolvedValue(null);

      const result = await cachedService.getAdZoneById('zone-999');

      expect(result).toBeNull();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return cached metrics on cache hit', async () => {
      mockCacheService.get.mockResolvedValue(mockAdMetrics);

      const result = await cachedService.getPerformanceMetrics('zone-1', 30);

      expect(result).toEqual(mockAdMetrics);
      expect(mockCacheService.get).toHaveBeenCalledWith('ads:performance:zone-1:30');
      expect(mockAdvertisementService.getPerformanceMetrics).not.toHaveBeenCalled();
    });

    it('should fetch from service and cache on cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAdvertisementService.getPerformanceMetrics.mockResolvedValue(mockAdMetrics);

      const result = await cachedService.getPerformanceMetrics('zone-1', 30);

      expect(result).toEqual(mockAdMetrics);
      expect(mockAdvertisementService.getPerformanceMetrics).toHaveBeenCalledWith('zone-1', 30);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'ads:performance:zone-1:30',
        mockAdMetrics,
        300 // AD_PERFORMANCE TTL (5 minutes)
      );
    });

    it('should use default days parameter of 30', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockAdvertisementService.getPerformanceMetrics.mockResolvedValue(mockAdMetrics);

      await cachedService.getPerformanceMetrics('zone-1');

      expect(mockAdvertisementService.getPerformanceMetrics).toHaveBeenCalledWith('zone-1', 30);
    });
  });

  describe('createAdZone', () => {
    it('should create ad zone and invalidate cache', async () => {
      const config: AdZoneConfig = {
        name: 'New Zone',
        position: 'sidebar',
        dimensions: { width: 300, height: 250, unit: 'px' },
      };

      mockAdvertisementService.createAdZone.mockResolvedValue(mockAdZone);

      const result = await cachedService.createAdZone(config);

      expect(result).toEqual(mockAdZone);
      expect(mockAdvertisementService.createAdZone).toHaveBeenCalledWith(config);
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ads:zones:*');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ads:zone:*');
    });
  });

  describe('updateAdPlacement', () => {
    it('should update ad placement and invalidate cache', async () => {
      const config = { isActive: false };
      mockAdvertisementService.updateAdPlacement.mockResolvedValue(mockAdZone);

      const result = await cachedService.updateAdPlacement('zone-1', config);

      expect(result).toEqual(mockAdZone);
      expect(mockAdvertisementService.updateAdPlacement).toHaveBeenCalledWith('zone-1', config);
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ads:zones:*');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ads:zone:*');
      expect(mockCacheService.delete).toHaveBeenCalledWith('ads:zone:zone-1');
    });
  });

  describe('deleteAdZone', () => {
    it('should delete ad zone and invalidate all related caches', async () => {
      mockAdvertisementService.deleteAdZone.mockResolvedValue(undefined);

      await cachedService.deleteAdZone('zone-1');

      expect(mockAdvertisementService.deleteAdZone).toHaveBeenCalledWith('zone-1');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ads:zones:*');
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ads:zone:*');
      expect(mockCacheService.delete).toHaveBeenCalledWith('ads:zone:zone-1');
      expect(mockCacheService.delete).toHaveBeenCalledWith('ads:performance:zone-1');
      expect(mockCacheService.delete).toHaveBeenCalledWith('ads:active:zone-1');
    });
  });

  describe('trackAdPerformance', () => {
    it('should track performance and invalidate performance caches', async () => {
      const event = {
        type: 'click' as const,
        timestamp: new Date(),
      };

      mockAdvertisementService.trackAdPerformance.mockResolvedValue(undefined);

      await cachedService.trackAdPerformance('ad-1', event);

      expect(mockAdvertisementService.trackAdPerformance).toHaveBeenCalledWith('ad-1', event);
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ads:performance:*');
    });
  });

  describe('getActiveAdvertisements', () => {
    it('should return cached active advertisements on cache hit', async () => {
      const mockAds: Advertisement[] = [
        {
          id: 'ad-1',
          zoneId: 'zone-1',
          type: 'static_banner',
          contentUrl: 'https://example.com/banner.jpg',
          targeting: {},
          startDate: new Date(),
          performanceData: { impressions: 100, clicks: 5, ctr: 5.0, lastUpdated: new Date() },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCacheService.get.mockResolvedValue(mockAds);

      const result = await cachedService.getActiveAdvertisements('zone-1');

      expect(result).toEqual(mockAds);
      expect(mockCacheService.get).toHaveBeenCalledWith('ads:active:zone-1');
      expect(mockAdvertisementService.getActiveAdvertisements).not.toHaveBeenCalled();
    });

    it('should fetch from service and cache on cache miss', async () => {
      const mockAds: Advertisement[] = [];
      mockCacheService.get.mockResolvedValue(null);
      mockAdvertisementService.getActiveAdvertisements.mockResolvedValue(mockAds);

      const result = await cachedService.getActiveAdvertisements('zone-1');

      expect(result).toEqual(mockAds);
      expect(mockAdvertisementService.getActiveAdvertisements).toHaveBeenCalledWith('zone-1');
      expect(mockCacheService.set).toHaveBeenCalledWith('ads:active:zone-1', mockAds, 600);
    });
  });

  describe('warmCache', () => {
    it('should warm cache with active zones and advertisements', async () => {
      const mockZones = [mockAdZone];
      const mockAds: Advertisement[] = [];

      mockAdvertisementService.getAdZones.mockResolvedValue(mockZones);
      mockAdvertisementService.getActiveAdvertisements.mockResolvedValue(mockAds);

      await cachedService.warmCache();

      expect(mockAdvertisementService.getAdZones).toHaveBeenCalledWith({ isActive: true });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'ads:zone:configs:{"isActive":true}',
        mockZones,
        600
      );
      expect(mockCacheService.set).toHaveBeenCalledWith('ads:zone:zone-1', mockAdZone, 600);
      expect(mockAdvertisementService.getActiveAdvertisements).toHaveBeenCalledWith('zone-1');
      expect(mockCacheService.set).toHaveBeenCalledWith('ads:active:zone-1', mockAds, 600);
    });

    it('should handle errors gracefully during cache warming', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAdvertisementService.getAdZones.mockRejectedValue(new Error('Database error'));

      await cachedService.warmCache();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error warming advertisement cache:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearCache', () => {
    it('should clear all advertisement caches', async () => {
      await cachedService.clearCache();

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ads:*');
    });
  });
});
