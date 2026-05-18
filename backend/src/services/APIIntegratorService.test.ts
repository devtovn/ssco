/**
 * Unit tests for API Integrator Service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';
import {
  TikiAPIClient,
  LazadaAPIClient,
  TikTokShopAPIClient,
  APIIntegratorService,
  NormalizedProduct,
} from './APIIntegratorService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('APIIntegratorService', () => {
  describe('TikiAPIClient', () => {
    let client: TikiAPIClient;

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Mock axios.create
      const mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: {
            use: jest.fn(),
          },
        },
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

      client = new TikiAPIClient('test-api-key');
    });

    it('should normalize Tiki product data correctly', async () => {
      const rawTikiData = {
        id: 12345,
        name: 'iPhone 15 Pro Max',
        description: 'Latest iPhone model',
        brand: { name: 'Apple' },
        price: 29990000,
        list_price: 32990000,
        inventory_status: 'available',
        thumbnail_url: 'https://tiki.vn/image1.jpg',
        images: [{ base_url: 'https://tiki.vn/image2.jpg' }],
        url_path: 'iphone-15-pro-max-p12345',
        rating_average: 4.8,
        review_count: 150,
        seller: { name: 'Tiki Trading' },
        specifications: { screen: '6.7 inch', ram: '8GB' },
      };

      const mockGet = jest.fn().mockResolvedValue({
        data: rawTikiData,
      });

      (client as any).client.get = mockGet;

      const response = await client.getProduct('12345');

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.externalId).toBe('12345');
      expect(response.data?.name).toBe('iPhone 15 Pro Max');
      expect(response.data?.brand).toBe('Apple');
      expect(response.data?.price).toBe(29990000);
      expect(response.data?.currency).toBe('VND');
      expect(response.data?.isAvailable).toBe(true);
      expect(response.data?.source).toBe('tiki');
      expect(response.data?.images).toHaveLength(2);
      expect(response.data?.sourceUrl).toBe('https://tiki.vn/iphone-15-pro-max-p12345');
    });

    it('should handle search products request', async () => {
      const mockSearchData = {
        data: [
          {
            id: 1,
            name: 'Product 1',
            price: 100000,
            inventory_status: 'available',
            thumbnail_url: 'https://tiki.vn/img1.jpg',
          },
          {
            id: 2,
            name: 'Product 2',
            price: 200000,
            inventory_status: 'available',
            thumbnail_url: 'https://tiki.vn/img2.jpg',
          },
        ],
      };

      const mockGet = jest.fn().mockResolvedValue({
        data: mockSearchData,
      });

      (client as any).client.get = mockGet;

      const response = await client.searchProducts('laptop', 20);

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(mockGet).toHaveBeenCalledWith('/v2/products', {
        params: {
          q: 'laptop',
          limit: 20,
          include: 'sale_attrs,brand,specifications',
        },
      });
    });

    it('should handle rate limiting with retry', async () => {
      const mockGet = jest
        .fn()
        .mockRejectedValueOnce({
          response: {
            status: 429,
            headers: { 'retry-after': '1' },
          },
          isAxiosError: true,
        })
        .mockResolvedValueOnce({
          data: { id: 1, name: 'Product', price: 100000 },
        });

      (client as any).client.get = mockGet;

      const response = await client.getProduct('1');

      expect(response.success).toBe(true);
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('should handle authentication errors', async () => {
      const mockGet = jest.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
        isAxiosError: true,
      });

      (client as any).client.get = mockGet;

      const response = await client.getProduct('1');

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('LazadaAPIClient', () => {
    let client: LazadaAPIClient;

    beforeEach(() => {
      jest.clearAllMocks();

      const mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: {
            use: jest.fn(),
          },
        },
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

      client = new LazadaAPIClient('test-api-key');
    });

    it('should normalize Lazada product data correctly', async () => {
      const rawLazadaData = {
        itemId: 67890,
        name: 'Samsung Galaxy S24',
        description: 'Latest Samsung flagship',
        brand: 'Samsung',
        price: 22990000,
        originalPrice: 24990000,
        available: true,
        quantity: 50,
        image: 'https://lazada.vn/image1.jpg',
        images: ['https://lazada.vn/image2.jpg'],
        productUrl: 'https://lazada.vn/samsung-galaxy-s24',
        ratingScore: 4.7,
        review: 200,
        sellerName: 'Lazada Official',
        attributes: { screen: '6.2 inch', ram: '8GB' },
      };

      const mockGet = jest.fn().mockResolvedValue({
        data: rawLazadaData,
      });

      (client as any).client.get = mockGet;

      const response = await client.getProduct('67890');

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.externalId).toBe('67890');
      expect(response.data?.name).toBe('Samsung Galaxy S24');
      expect(response.data?.brand).toBe('Samsung');
      expect(response.data?.price).toBe(22990000);
      expect(response.data?.isAvailable).toBe(true);
      expect(response.data?.source).toBe('lazada');
      expect(response.data?.images).toHaveLength(2);
    });
  });

  describe('TikTokShopAPIClient', () => {
    let client: TikTokShopAPIClient;

    beforeEach(() => {
      jest.clearAllMocks();

      const mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: {
            use: jest.fn(),
          },
        },
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

      client = new TikTokShopAPIClient('test-api-key');
    });

    it('should normalize TikTok Shop product data correctly', async () => {
      const rawTikTokData = {
        product_id: 99999,
        product_name: 'Xiaomi 14 Pro',
        description: 'Flagship Xiaomi phone',
        brand_name: 'Xiaomi',
        price: 19990000,
        original_price: 21990000,
        status: 'ACTIVE',
        stock: 100,
        main_image: 'https://tiktokshop.com/image1.jpg',
        images: [{ url: 'https://tiktokshop.com/image2.jpg' }],
        product_url: 'https://tiktokshop.com/xiaomi-14-pro',
        rating: 4.6,
        review_count: 180,
        shop_name: 'Xiaomi Official Store',
        attributes: { screen: '6.73 inch', ram: '12GB' },
      };

      const mockGet = jest.fn().mockResolvedValue({
        data: { data: rawTikTokData },
      });

      (client as any).client.get = mockGet;

      const response = await client.getProduct('99999');

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.externalId).toBe('99999');
      expect(response.data?.name).toBe('Xiaomi 14 Pro');
      expect(response.data?.brand).toBe('Xiaomi');
      expect(response.data?.price).toBe(19990000);
      expect(response.data?.isAvailable).toBe(true);
      expect(response.data?.source).toBe('tiktok_shop');
    });
  });

  describe('APIIntegratorService', () => {
    let service: APIIntegratorService;

    beforeEach(() => {
      jest.clearAllMocks();

      // Mock environment variables
      process.env.TIKI_API_KEY = 'tiki-key';
      process.env.LAZADA_API_KEY = 'lazada-key';
      process.env.TIKTOK_SHOP_API_KEY = 'tiktok-key';

      const mockAxiosInstance = {
        get: jest.fn(),
        interceptors: {
          request: {
            use: jest.fn(),
          },
        },
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

      service = new APIIntegratorService();
    });

    it('should initialize with all clients when API keys are available', () => {
      expect(service.hasAvailableClients()).toBe(true);
      expect(service.getAvailablePlatforms()).toEqual(['tiki', 'lazada', 'tiktok_shop']);
    });

    it('should search all platforms in parallel', async () => {
      const mockTikiData = [
        { id: 1, name: 'Tiki Product', price: 100000, inventory_status: 'available' },
      ];
      const mockLazadaData = [
        { itemId: 2, name: 'Lazada Product', price: 200000, available: true },
      ];
      const mockTikTokData = [
        { product_id: 3, product_name: 'TikTok Product', price: 300000, status: 'ACTIVE' },
      ];

      const mockGet = jest
        .fn()
        .mockResolvedValueOnce({ data: { data: mockTikiData } })
        .mockResolvedValueOnce({ data: { data: { products: mockLazadaData } } })
        .mockResolvedValueOnce({ data: { data: { products: mockTikTokData } } });

      (service as any).tikiClient.client.get = mockGet;
      (service as any).lazadaClient.client.get = mockGet;
      (service as any).tiktokClient.client.get = mockGet;

      const results = await service.searchAllPlatforms('laptop', 20);

      expect(results.tiki).toBeDefined();
      expect(results.lazada).toBeDefined();
      expect(results.tiktok).toBeDefined();
    });

    it('should get all products from successful responses', async () => {
      const mockTikiData = [
        { id: 1, name: 'Product 1', price: 100000, inventory_status: 'available' },
      ];

      const mockGet = jest.fn().mockResolvedValue({ data: { data: mockTikiData } });

      (service as any).tikiClient.client.get = mockGet;
      (service as any).lazadaClient.client.get = jest
        .fn()
        .mockRejectedValue(new Error('API error'));
      (service as any).tiktokClient.client.get = jest
        .fn()
        .mockRejectedValue(new Error('API error'));

      const products = await service.getAllProducts('laptop', 20);

      expect(products.length).toBeGreaterThan(0);
      expect(products[0].source).toBe('tiki');
    });

    it('should handle platform-specific product retrieval', async () => {
      const mockData = {
        id: 123,
        name: 'Test Product',
        price: 500000,
        inventory_status: 'available',
      };

      const mockGet = jest.fn().mockResolvedValue({ data: mockData });
      (service as any).tikiClient.client.get = mockGet;

      const response = await service.getProduct('tiki', '123');

      expect(response.success).toBe(true);
      expect(response.data?.externalId).toBe('123');
    });

    it('should return error for unknown platform', async () => {
      const response = await service.getProduct('unknown' as any, '123');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown platform');
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({ data: { id: 1 } }),
        interceptors: {
          request: {
            use: jest.fn(),
          },
        },
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

      const client = new TikiAPIClient('test-key');

      // Make multiple requests rapidly
      const promises = Array.from({ length: 5 }, () => client.getProduct('1'));
      const results = await Promise.all(promises);

      // All should succeed (rate limiter should handle them)
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Exponential Backoff', () => {
    it('should retry with exponential backoff on server errors', async () => {
      const mockGet = jest
        .fn()
        .mockRejectedValueOnce({
          response: { status: 500 },
          isAxiosError: true,
        })
        .mockRejectedValueOnce({
          response: { status: 500 },
          isAxiosError: true,
        })
        .mockResolvedValueOnce({
          data: { id: 1, name: 'Product', price: 100000 },
        });

      const mockAxiosInstance = {
        get: mockGet,
        interceptors: {
          request: {
            use: jest.fn(),
          },
        },
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

      const client = new TikiAPIClient('test-key');
      const response = await client.getProduct('1');

      expect(response.success).toBe(true);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });
  });

  describe('API Key Rotation', () => {
    it('should rotate API keys on authentication failure', async () => {
      const mockAxiosInstance = {
        get: jest
          .fn()
          .mockRejectedValueOnce({
            response: { status: 401 },
            isAxiosError: true,
          })
          .mockResolvedValueOnce({
            data: { id: 1, name: 'Product', price: 100000 },
          }),
        interceptors: {
          request: {
            use: jest.fn((interceptor) => {
              // Simulate interceptor behavior
              return 0;
            }),
          },
        },
      };
      mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

      const client = new TikiAPIClient(['key1', 'key2']);
      const response = await client.getProduct('1');

      // Should succeed after rotating to second key
      expect(response.success).toBe(true);
    });
  });
});
