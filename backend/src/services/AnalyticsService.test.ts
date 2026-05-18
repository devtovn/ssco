/**
 * Unit tests for Analytics Service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { AnalyticsService } from './AnalyticsService';

describe('AnalyticsService', () => {
  let pool: jest.Mocked<Pool>;
  let service: AnalyticsService;

  beforeEach(() => {
    pool = { query: jest.fn() } as unknown as jest.Mocked<Pool>;
    service = new AnalyticsService(pool);
  });

  describe('trackUserInteraction', () => {
    it('should insert interaction record', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await service.trackUserInteraction({
        eventType: 'page_view',
        pagePath: '/products/1',
        userSession: 'session-abc',
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_interactions'),
        expect.arrayContaining(['page_view', '/products/1'])
      );
    });
  });

  describe('trackSearchQuery', () => {
    it('should insert search log', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await service.trackSearchQuery({
        query: 'iphone 15',
        resultsCount: 12,
        userSession: 'session-abc',
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO search_logs'),
        expect.arrayContaining(['iphone 15', 12])
      );
    });
  });

  describe('getPopularProducts', () => {
    it('should return popular products', async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            product_id: 'uuid-1',
            product_name: 'iPhone 15',
            view_count: '50',
            click_count: '10',
          },
        ],
      });

      const products = await service.getPopularProducts(7, 10);

      expect(products).toHaveLength(1);
      expect(products[0].productName).toBe('iPhone 15');
      expect(products[0].viewCount).toBe(50);
    });
  });

  describe('getSearchTrends', () => {
    it('should return aggregated search trends', async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            query: 'laptop',
            search_count: '30',
            avg_results: '15.50',
            last_searched: new Date().toISOString(),
          },
        ],
      });

      const trends = await service.getSearchTrends(7);

      expect(trends[0].query).toBe('laptop');
      expect(trends[0].searchCount).toBe(30);
    });
  });

  describe('generateReport', () => {
    it('should combine analytics data into a report', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              product_id: 'uuid-1',
              product_name: 'Test',
              view_count: '5',
              click_count: '1',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              query: 'test',
              search_count: '3',
              avg_results: '10',
              last_searched: new Date().toISOString(),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ errors: '0', requests: '0', avg_response: '0' }] })
        .mockResolvedValueOnce({
          rows: [{ page_views: '100', searches: '20', unique_sessions: '15' }],
        })
        .mockResolvedValue({ rows: [] });

      const report = await service.generateReport(7);

      expect(report.popularProducts).toHaveLength(1);
      expect(report.searchTrends).toHaveLength(1);
      expect(report.summary.totalPageViews).toBe(100);
    });
  });
});
