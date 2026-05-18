/**
 * Unit tests for Web Scraper Service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { WebScraperService } from './WebScraperService';
import { NormalizedProduct } from './APIIntegratorService';

describe('WebScraperService', () => {
  let scraper: WebScraperService;

  beforeEach(() => {
    scraper = new WebScraperService({ enabled: false, proxies: [] });
  });

  describe('validateProduct', () => {
    it('should accept valid product data', () => {
      const product: NormalizedProduct = {
        externalId: '123',
        name: 'iPhone 15',
        price: 25000000,
        currency: 'VND',
        isAvailable: true,
        images: ['https://example.com/img.jpg'],
        sourceUrl: 'https://tiki.vn/product/123',
        source: 'tiki',
      };

      const result = scraper.validateProduct(product);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid product data', () => {
      const product: NormalizedProduct = {
        externalId: '',
        name: '',
        price: 0,
        currency: 'VND',
        isAvailable: true,
        images: [],
        sourceUrl: 'not-a-url',
        source: '',
      };

      const result = scraper.validateProduct(product);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('detectCaptcha', () => {
    it('should detect CAPTCHA in page content', () => {
      expect(scraper.detectCaptcha('<motion-recaptcha></div>', 'Verify')).toBe(true);
      expect(scraper.detectCaptcha('<html>normal page</html>', 'Product')).toBe(false);
    });
  });

  describe('detectSource', () => {
    it('should detect platform from URL', () => {
      expect(scraper.detectSource('https://tiki.vn/product/123')).toBe('tiki');
      expect(scraper.detectSource('https://www.lazada.vn/products/abc')).toBe('lazada');
      expect(scraper.detectSource('https://shopee.vn/item/1')).toBe('shopee');
    });
  });

  describe('buildSearchUrl', () => {
    it('should build search URLs for supported platforms', () => {
      expect(scraper.buildSearchUrl('tiki', 'iphone')).toContain('tiki.vn/search');
      expect(scraper.buildSearchUrl('lazada', 'laptop')).toContain('lazada.vn/catalog');
      expect(scraper.buildSearchUrl('unknown', 'test')).toBeNull();
    });
  });

  describe('scrapeUrl', () => {
    it('should return error when scraping is disabled', async () => {
      const result = await scraper.scrapeUrl('https://tiki.vn/product/1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });
  });
});
