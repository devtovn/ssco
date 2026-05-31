/**
 * Unit tests for Data Collection Service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { DataCollectionService } from './DataCollectionService';
import { APIIntegratorService, NormalizedProduct } from './APIIntegratorService';
import { WebScraperService } from './WebScraperService';

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
  let webScraper: jest.Mocked<WebScraperService>;
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

    webScraper = {
      validateProduct: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      scrapeUrls: jest.fn(),
      scrapeUrl: jest.fn(),
      buildSearchUrl: jest.fn().mockReturnValue(null),
    } as unknown as jest.Mocked<WebScraperService>;

    service = new DataCollectionService(pool, apiIntegrator, webScraper);
  });

  describe('validateProductData', () => {
    it('should validate and normalize product data', () => {
      const result = service.validateProductData(mockProduct);
      expect(result.valid).toBe(true);
      expect(result.normalized?.name).toBe('Samsung Galaxy S24');
      expect(result.normalized?.currency).toBe('VND');
    });

    it('should reject invalid products', () => {
      webScraper.validateProduct.mockReturnValue({
        valid: false,
        errors: ['Price must be greater than 0'],
      });

      const result = service.validateProductData({ ...mockProduct, price: 0 });
      expect(result.valid).toBe(false);
    });
  });

  describe('collectFromAPIs', () => {
    it('should collect and store products from APIs', async () => {
      apiIntegrator.getAllProducts.mockResolvedValue([mockProduct]);

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient as never);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN - actually first is BEGIN
        .mockResolvedValueOnce({ rows: [] }) // existing product check
        .mockResolvedValueOnce({ rows: [{ id: '01ARYZ6S41TSV4RRFFQ69G5FAV' }] }) // insert product
        .mockResolvedValueOnce({ rows: [] }); // insert price

      // Simplify: mock connect to handle transaction
      mockClient.query.mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes('SELECT p.id')) return { rows: [] };
        if (sql.includes('INSERT INTO products')) return { rows: [{ id: '01ARYZ6S41TSV4RRFFQ69G5FAV' }] };
        if (sql.includes('INSERT INTO price_entries')) return { rows: [] };
        if (sql.includes('UPDATE price_sources')) return { rows: [] };
        return { rows: [] };
      });

      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.collectFromAPIs(['samsung']);

      expect(apiIntegrator.getAllProducts).toHaveBeenCalledWith('samsung', 20);
      expect(result.collectedCount).toBe(1);
      expect(result.storedCount).toBe(1);
    });

    it('should use scraping fallback when API returns empty', async () => {
      apiIntegrator.getAllProducts.mockResolvedValue([]);
      pool.query.mockResolvedValue({
        rows: [{ id: '1', name: 'Tiki Web', source_type: 'scrape', platform: 'tiki', base_url: '', is_active: true, reliability_score: 1 }],
      });

      webScraper.buildSearchUrl.mockReturnValue('https://tiki.vn/search?q=samsung');
      webScraper.scrapeUrl.mockResolvedValue({
        success: true,
        data: mockProduct,
        source: 'tiki',
        url: 'https://tiki.vn/search?q=samsung',
        timestamp: new Date(),
      });

      const mockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('INSERT INTO products')) return { rows: [{ id: '01ARYZ6S41TSV4RRFFQ69G5FAV' }] };
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient as never);

      const result = await service.collectFromAPIs(['samsung']);

      expect(result.usedScrapingFallback).toBe(true);
      expect(webScraper.scrapeUrl).toHaveBeenCalled();
    });
  });

  describe('scrapeWebsites', () => {
    it('should scrape and store valid products', async () => {
      webScraper.scrapeUrls.mockResolvedValue({
        success: true,
        results: [
          {
            success: true,
            data: mockProduct,
            source: 'tiki',
            url: mockProduct.sourceUrl,
            timestamp: new Date(),
          },
        ],
        successCount: 1,
        failedCount: 0,
        captchaCount: 0,
        timestamp: new Date(),
      });

      const mockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('INSERT INTO products')) return { rows: [{ id: '01ARYZ6S41TSV4RRFFQ69G5FAV' }] };
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient as never);
      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.scrapeWebsites([mockProduct.sourceUrl]);

      expect(result.collectedCount).toBe(1);
      expect(result.storedCount).toBe(1);
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
