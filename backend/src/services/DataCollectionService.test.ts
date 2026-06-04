/**
 * Unit tests for Data Collection Service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { DataCollectionService } from './DataCollectionService';
import { APIIntegratorService, NormalizedProduct } from './APIIntegratorService';

const mockProduct: NormalizedProduct = {
  externalId: 'ext-1',
  name: 'Samsung Galaxy S24',
  brand: 'Samsung',
  price: 18000000,
  currency: 'VND',
  isAvailable: true,
  images: ['https://example.com/img.jpg'],
  sourceUrl: 'https://tiki.vn/product/ext-1',
  source: 'tiki',
};

describe('DataCollectionService', () => {
  let pool: jest.Mocked<Pool>;
  let apiIntegrator: jest.Mocked<APIIntegratorService>;
  let service: DataCollectionService;

  beforeEach(() => {
    pool = {
      query: jest.fn(),
      connect: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    apiIntegrator = {
      getAllProducts: jest.fn(),
      getAvailablePlatforms: jest.fn().mockReturnValue(['tiki']),
      hasAvailableClients: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<APIIntegratorService>;

    service = new DataCollectionService(pool, apiIntegrator);
  });

  describe('validateProductData', () => {
    it('should validate and normalize product data', () => {
      const result = service.validateProductData(mockProduct);
      expect(result.valid).toBe(true);
      expect(result.normalized?.name).toBe('Samsung Galaxy S24');
      expect(result.normalized?.currency).toBe('VND');
    });

    it('should reject product with price 0', () => {
      const result = service.validateProductData({ ...mockProduct, price: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Price must be greater than 0');
    });

    it('should reject product with short name', () => {
      const result = service.validateProductData({ ...mockProduct, name: 'A' });
      expect(result.valid).toBe(false);
    });

    it('should reject product with invalid URL', () => {
      const result = service.validateProductData({ ...mockProduct, sourceUrl: 'not-a-url' });
      expect(result.valid).toBe(false);
    });
  });

  describe('collectFromAPIs', () => {
    it('should collect and store products from APIs', async () => {
      apiIntegrator.getAllProducts.mockResolvedValue([mockProduct]);

      const mockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
          if (sql.includes('SELECT p.id')) return { rows: [] };
          if (sql.includes('INSERT INTO products')) return { rows: [{ id: '01ARYZ6S41TSV4RRFFQ69G5FAV' }] };
          if (sql.includes('INSERT INTO price_entries')) return { rows: [] };
          if (sql.includes('UPDATE price_sources')) return { rows: [] };
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient as never);
      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.collectFromAPIs(['samsung']);

      expect(apiIntegrator.getAllProducts).toHaveBeenCalledWith('samsung', 20);
      expect(result.collectedCount).toBe(1);
      expect(result.storedCount).toBe(1);
    });

    it('should handle API error gracefully', async () => {
      apiIntegrator.getAllProducts.mockRejectedValue(new Error('API down'));
      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.collectFromAPIs(['samsung']);

      expect(result.collectedCount).toBe(0);
      expect(result.errors[0]).toContain('API down');
    });
  });

  describe('getActivePriceSources', () => {
    it('should return active price sources', async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            id: '01ARYZ6S41TSV4RRFFQ69G5FAV',
            name: 'Tiki API',
            source_type: 'api',
            platform: 'tiki',
            base_url: 'https://api.tiki.vn',
            is_active: true,
            reliability_score: '0.95',
          },
        ],
      });

      const sources = await service.getActivePriceSources();

      expect(sources).toHaveLength(1);
      expect(sources[0].platform).toBe('tiki');
      expect(sources[0].reliabilityScore).toBe(0.95);
    });
  });
});
