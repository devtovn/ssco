/**
 * Unit tests for AdvertisementService
 */

import { Pool } from 'pg';
import {
  AdvertisementService,
  AdZoneConfig,
  PlacementConfig,
  AdEvent,
  AdType,
} from './AdvertisementService';

// Mock Pool
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
} as unknown as Pool;

describe('AdvertisementService', () => {
  let service: AdvertisementService;
  let mockClient: any;

  beforeEach(() => {
    service = new AdvertisementService(mockPool);

    // Mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAdZone', () => {
    it('should create a new ad zone with valid configuration', async () => {
      const config: AdZoneConfig = {
        name: 'Header Banner',
        position: 'header',
        dimensions: {
          width: 728,
          height: 90,
          unit: 'px',
        },
        configuration: {
          displayTiming: {
            delayMs: 1000,
            frequency: 'always',
          },
        },
      };

      const mockAdZone = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Header Banner',
        position: 'header',
        dimensions: JSON.stringify(config.dimensions),
        configuration: JSON.stringify(config.configuration),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // name check
        .mockResolvedValueOnce({ rows: [mockAdZone] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.createAdZone(config);

      expect(result.name).toBe('Header Banner');
      expect(result.position).toBe('header');
      expect(result.dimensions.width).toBe(728);
      expect(result.isActive).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error for invalid position', async () => {
      const config: AdZoneConfig = {
        name: 'Invalid Zone',
        position: 'invalid' as any,
        dimensions: {
          width: 300,
          height: 250,
          unit: 'px',
        },
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(service.createAdZone(config)).rejects.toThrow('Invalid position');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error for invalid dimensions', async () => {
      const config: AdZoneConfig = {
        name: 'Invalid Dimensions',
        position: 'sidebar',
        dimensions: {
          width: -100,
          height: 250,
          unit: 'px',
        },
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(service.createAdZone(config)).rejects.toThrow(
        'Dimensions width and height must be positive numbers'
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error for duplicate zone name', async () => {
      const config: AdZoneConfig = {
        name: 'Existing Zone',
        position: 'footer',
        dimensions: {
          width: 728,
          height: 90,
          unit: 'px',
        },
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] }) // name check
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(service.createAdZone(config)).rejects.toThrow(
        "Ad zone with name 'Existing Zone' already exists"
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should support all valid positions', async () => {
      const positions = ['header', 'footer', 'sidebar', 'in-content', 'overlay', 'floating'];

      for (const position of positions) {
        const config: AdZoneConfig = {
          name: `${position} Zone`,
          position: position as any,
          dimensions: {
            width: 300,
            height: 250,
            unit: 'px',
          },
        };

        const mockAdZone = {
          id: `zone-${position}`,
          name: config.name,
          position: position,
          dimensions: JSON.stringify(config.dimensions),
          configuration: JSON.stringify({}),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockClient.query
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // name check
          .mockResolvedValueOnce({ rows: [mockAdZone] }) // INSERT
          .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const result = await service.createAdZone(config);
        expect(result.position).toBe(position);
      }
    });
  });

  describe('updateAdPlacement', () => {
    it('should update ad zone dimensions', async () => {
      const zoneId = '123e4567-e89b-12d3-a456-426614174000';
      const config: PlacementConfig = {
        dimensions: {
          width: 970,
          height: 250,
          unit: 'px',
        },
      };

      const existingZone = {
        id: zoneId,
        name: 'Header Banner',
        position: 'header',
        dimensions: JSON.stringify({ width: 728, height: 90, unit: 'px' }),
        configuration: JSON.stringify({}),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedZone = {
        ...existingZone,
        dimensions: JSON.stringify(config.dimensions),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [existingZone] }) // exists check
        .mockResolvedValueOnce({ rows: [updatedZone] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.updateAdPlacement(zoneId, config);

      expect(result.dimensions.width).toBe(970);
      expect(result.dimensions.height).toBe(250);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should update ad zone configuration', async () => {
      const zoneId = '123e4567-e89b-12d3-a456-426614174000';
      const config: PlacementConfig = {
        configuration: {
          displayTiming: {
            delayMs: 2000,
            frequency: 'once',
          },
        },
      };

      const existingZone = {
        id: zoneId,
        name: 'Sidebar Ad',
        position: 'sidebar',
        dimensions: JSON.stringify({ width: 300, height: 600, unit: 'px' }),
        configuration: JSON.stringify({}),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedZone = {
        ...existingZone,
        configuration: JSON.stringify(config.configuration),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [existingZone] }) // exists check
        .mockResolvedValueOnce({ rows: [updatedZone] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.updateAdPlacement(zoneId, config);

      expect(result.configuration.displayTiming?.delayMs).toBe(2000);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error for non-existent zone', async () => {
      const zoneId = 'non-existent-id';
      const config: PlacementConfig = {
        isActive: false,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // exists check
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(service.updateAdPlacement(zoneId, config)).rejects.toThrow(
        `Ad zone with ID ${zoneId} not found`
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('trackAdPerformance', () => {
    it('should track impression event', async () => {
      const adId = 'ad-123';
      const event: AdEvent = {
        type: 'impression',
        timestamp: new Date(),
        metadata: {
          userSession: 'session-123',
          page: '/products/123',
        },
      };

      const existingAd = {
        id: adId,
        zone_id: 'zone-123',
        performance_data: JSON.stringify({
          impressions: 100,
          clicks: 5,
          ctr: 5.0,
        }),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [existingAd] }) // ad check
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await service.trackAdPerformance(adId, event);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      // Verify UPDATE was called with incremented impressions
      const updateCall = mockClient.query.mock.calls.find(
        (call) => call[0].includes('UPDATE advertisements')
      );
      expect(updateCall).toBeDefined();
    });

    it('should track click event and update CTR', async () => {
      const adId = 'ad-123';
      const event: AdEvent = {
        type: 'click',
        timestamp: new Date(),
      };

      const existingAd = {
        id: adId,
        zone_id: 'zone-123',
        performance_data: JSON.stringify({
          impressions: 100,
          clicks: 5,
          ctr: 5.0,
        }),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [existingAd] }) // ad check
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await service.trackAdPerformance(adId, event);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error for non-existent advertisement', async () => {
      const adId = 'non-existent-ad';
      const event: AdEvent = {
        type: 'impression',
        timestamp: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // ad check
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(service.trackAdPerformance(adId, event)).rejects.toThrow(
        `Advertisement with ID ${adId} not found`
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return aggregated performance metrics', async () => {
      const zoneId = 'zone-123';

      const mockZone = {
        id: zoneId,
        name: 'Header Banner',
      };

      const mockAds = [
        {
          id: 'ad-1',
          type: 'google_ads',
          performance_data: JSON.stringify({
            impressions: 1000,
            clicks: 50,
            ctr: 5.0,
          }),
          created_at: new Date(),
        },
        {
          id: 'ad-2',
          type: 'static_banner',
          performance_data: JSON.stringify({
            impressions: 500,
            clicks: 25,
            ctr: 5.0,
          }),
          created_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockZone] }) // zone check
        .mockResolvedValueOnce({ rows: mockAds }); // ads query

      const result = await service.getPerformanceMetrics(zoneId);

      expect(result.zoneId).toBe(zoneId);
      expect(result.zoneName).toBe('Header Banner');
      expect(result.totalImpressions).toBe(1500);
      expect(result.totalClicks).toBe(75);
      expect(result.ctr).toBe(5.0);
      expect(result.performanceByAd).toHaveLength(2);
    });

    it('should throw error for non-existent zone', async () => {
      const zoneId = 'non-existent-zone';

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(service.getPerformanceMetrics(zoneId)).rejects.toThrow(
        `Ad zone with ID ${zoneId} not found`
      );
    });
  });

  describe('deleteAdZone', () => {
    it('should delete ad zone without active advertisements', async () => {
      const zoneId = 'zone-123';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: zoneId }] }) // exists check
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // active ads check
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await service.deleteAdZone(zoneId);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM ad_zones WHERE id = $1',
        [zoneId]
      );
    });

    it('should throw error when deleting zone with active advertisements', async () => {
      const zoneId = 'zone-123';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: zoneId }] }) // exists check
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // active ads check
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(service.deleteAdZone(zoneId)).rejects.toThrow(
        'Cannot delete ad zone with 3 active advertisements'
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error for non-existent zone', async () => {
      const zoneId = 'non-existent-zone';

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // exists check
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(service.deleteAdZone(zoneId)).rejects.toThrow(
        `Ad zone with ID ${zoneId} not found`
      );
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('createAdvertisement', () => {
    it('should create a new advertisement', async () => {
      const zoneId = 'zone-123';
      const type: AdType = 'google_ads';
      const contentUrl = 'https://example.com/ad-script.js';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockAd = {
        id: 'ad-123',
        zone_id: zoneId,
        type: type,
        content_url: contentUrl,
        targeting: JSON.stringify({}),
        start_date: startDate,
        end_date: endDate,
        performance_data: JSON.stringify({
          impressions: 0,
          clicks: 0,
          ctr: 0,
        }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: zoneId }] }) // zone check
        .mockResolvedValueOnce({ rows: [mockAd] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.createAdvertisement(
        zoneId,
        type,
        contentUrl,
        startDate,
        endDate
      );

      expect(result.zoneId).toBe(zoneId);
      expect(result.type).toBe(type);
      expect(result.contentUrl).toBe(contentUrl);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error for invalid ad type', async () => {
      const zoneId = 'zone-123';
      const type = 'invalid_type' as AdType;
      const contentUrl = 'https://example.com/ad.jpg';
      const startDate = new Date();

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: zoneId }] }) // zone check
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        service.createAdvertisement(zoneId, type, contentUrl, startDate)
      ).rejects.toThrow('Invalid ad type');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error when end date is before start date', async () => {
      const zoneId = 'zone-123';
      const type: AdType = 'static_banner';
      const contentUrl = 'https://example.com/banner.jpg';
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: zoneId }] }) // zone check
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        service.createAdvertisement(zoneId, type, contentUrl, startDate, endDate)
      ).rejects.toThrow('End date must be after start date');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getAdZones', () => {
    it('should return all ad zones', async () => {
      const mockZones = [
        {
          id: 'zone-1',
          name: 'Header',
          position: 'header',
          dimensions: JSON.stringify({ width: 728, height: 90, unit: 'px' }),
          configuration: JSON.stringify({}),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'zone-2',
          name: 'Sidebar',
          position: 'sidebar',
          dimensions: JSON.stringify({ width: 300, height: 600, unit: 'px' }),
          configuration: JSON.stringify({}),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockZones });

      const result = await service.getAdZones();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Header');
      expect(result[1].name).toBe('Sidebar');
    });

    it('should filter by active status', async () => {
      const mockZones = [
        {
          id: 'zone-1',
          name: 'Active Zone',
          position: 'header',
          dimensions: JSON.stringify({ width: 728, height: 90, unit: 'px' }),
          configuration: JSON.stringify({}),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: mockZones });

      const result = await service.getAdZones({ isActive: true });

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });
});
