/**
 * API Integrator Service
 * Handles API integration with e-commerce platforms (Tiki, Lazada, Shopee, TikTok Shop)
 * Implements rate limiting, exponential backoff, API key rotation, and data normalization
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { createHmac } from 'crypto';

/**
 * Normalized product data structure
 */
export interface NormalizedProduct {
  externalId: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  price: number;
  currency: string;
  isAvailable: boolean;
  images: string[];
  sourceUrl: string;
  source: string;
  specifications?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  timestamp: Date;
}

/**
 * Rate limiter configuration
 */
interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs?: number;
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requests: number[];
  retryAfter?: Date;
}

/**
 * API key rotation manager
 */
class APIKeyRotator {
  private keys: string[];
  private currentIndex: number = 0;
  private failedKeys: Set<string> = new Set();

  constructor(keys: string | string[]) {
    this.keys = Array.isArray(keys) ? keys : [keys];
  }

  getCurrentKey(): string {
    if (this.keys.length === 0) {
      throw new Error('No API keys available');
    }

    // Find next available key
    let attempts = 0;
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      if (!this.failedKeys.has(key)) {
        return key;
      }
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;
    }

    // All keys failed, reset and try again
    this.failedKeys.clear();
    return this.keys[this.currentIndex];
  }

  rotateKey(): string {
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return this.getCurrentKey();
  }

  markKeyAsFailed(key: string): void {
    this.failedKeys.add(key);
  }

  resetFailedKeys(): void {
    this.failedKeys.clear();
  }

  hasAvailableKeys(): boolean {
    return this.failedKeys.size < this.keys.length;
  }
}

/**
 * Rate limiter with sliding window
 */
class RateLimiter {
  private state: RateLimiterState = { requests: [] };
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();

    // Check if we're in retry-after period
    if (this.state.retryAfter && now < this.state.retryAfter.getTime()) {
      return false;
    }

    // Remove old requests outside the window
    this.state.requests = this.state.requests.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );

    // Check if we've exceeded the limit
    if (this.state.requests.length >= this.config.maxRequests) {
      return false;
    }

    return true;
  }

  recordRequest(): void {
    this.state.requests.push(Date.now());
  }

  setRetryAfter(ms: number): void {
    this.state.retryAfter = new Date(Date.now() + ms);
  }

  getWaitTime(): number {
    const now = Date.now();

    // Check retry-after period
    if (this.state.retryAfter && now < this.state.retryAfter.getTime()) {
      return this.state.retryAfter.getTime() - now;
    }

    // Calculate wait time based on sliding window
    if (this.state.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.state.requests[0];
      const waitTime = this.config.windowMs - (now - oldestRequest);
      return Math.max(0, waitTime);
    }

    return 0;
  }
}

/**
 * Exponential backoff with jitter
 */
class ExponentialBackoff {
  private baseDelayMs: number;
  private maxDelayMs: number;
  private maxRetries: number;

  constructor(
    baseDelayMs: number = 1000,
    maxDelayMs: number = 30000,
    maxRetries: number = 5
  ) {
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.maxRetries = maxRetries;
  }

  calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt);
    
    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    
    // Add jitter (random value between 0 and delay)
    const jitter = Math.random() * cappedDelay;
    
    return Math.floor(cappedDelay + jitter);
  }

  async wait(attempt: number): Promise<void> {
    const delay = this.calculateDelay(attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  shouldRetry(attempt: number): boolean {
    return attempt < this.maxRetries;
  }
}

/**
 * Base API client with common functionality
 */
abstract class BaseAPIClient {
  protected client: AxiosInstance;
  protected rateLimiter: RateLimiter;
  protected backoff: ExponentialBackoff;
  protected keyRotator?: APIKeyRotator;
  protected source: string;

  constructor(
    baseURL: string,
    apiKeys: string | string[],
    source: string,
    rateLimitConfig: RateLimiterConfig
  ) {
    this.source = source;
    this.rateLimiter = new RateLimiter(rateLimitConfig);
    this.backoff = new ExponentialBackoff();

    // Initialize API key rotator if keys provided
    if (apiKeys && (Array.isArray(apiKeys) ? apiKeys.length > 0 : apiKeys.trim().length > 0)) {
      this.keyRotator = new APIKeyRotator(apiKeys);
    }

    // Create axios instance
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PriceComparisonBot/1.0',
      },
    });

    // Add request interceptor for API key injection
    this.client.interceptors.request.use((config) => {
      if (this.keyRotator) {
        const apiKey = this.keyRotator.getCurrentKey();
        config.headers = config.headers || {};
        this.injectAPIKey(config.headers, apiKey);
      }
      return config;
    });
  }

  /**
   * Inject API key into request headers (to be implemented by subclasses)
   */
  protected abstract injectAPIKey(headers: any, apiKey: string): void;

  /**
   * Normalize product data (to be implemented by subclasses)
   */
  protected abstract normalizeProduct(rawData: any): NormalizedProduct;

  /**
   * Make API request with rate limiting, retries, and error handling
   */
  protected async makeRequest<T>(
    requestFn: () => Promise<T>,
    attempt: number = 0
  ): Promise<APIResponse<T>> {
    try {
      // Check rate limit
      const canProceed = await this.rateLimiter.checkLimit();
      if (!canProceed) {
        const waitTime = this.rateLimiter.getWaitTime();
        console.log(`[${this.source}] Rate limit reached, waiting ${waitTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.makeRequest(requestFn, attempt);
      }

      // Record request
      this.rateLimiter.recordRequest();

      // Execute request
      const data = await requestFn();

      return {
        success: true,
        data,
        source: this.source,
        timestamp: new Date(),
      };
    } catch (error) {
      return this.handleError(error, requestFn, attempt);
    }
  }

  /**
   * Handle API errors with retry logic
   */
  private async handleError<T>(
    error: any,
    requestFn: () => Promise<T>,
    attempt: number
  ): Promise<APIResponse<T>> {
    const axiosError = error as AxiosError;

    // Handle rate limiting (429)
    if (axiosError.response?.status === 429) {
      const retryAfter = axiosError.response.headers['retry-after'];
      const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      
      console.log(`[${this.source}] Rate limited (429), retry after ${retryMs}ms`);
      this.rateLimiter.setRetryAfter(retryMs);

      if (this.backoff.shouldRetry(attempt)) {
        await this.backoff.wait(attempt);
        return this.makeRequest(requestFn, attempt + 1);
      }
    }

    // Handle authentication errors (401, 403)
    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      console.log(`[${this.source}] Authentication error, rotating API key`);
      
      if (this.keyRotator) {
        const currentKey = this.keyRotator.getCurrentKey();
        this.keyRotator.markKeyAsFailed(currentKey);

        if (this.keyRotator.hasAvailableKeys()) {
          this.keyRotator.rotateKey();
          console.log(`[${this.source}] Rotated to next API key`);
          return this.makeRequest(requestFn, attempt);
        }
      }
    }

    // Handle server errors (5xx) with retry
    if (axiosError.response?.status && axiosError.response.status >= 500) {
      console.log(`[${this.source}] Server error (${axiosError.response.status}), retrying...`);
      
      if (this.backoff.shouldRetry(attempt)) {
        await this.backoff.wait(attempt);
        return this.makeRequest(requestFn, attempt + 1);
      }
    }

    // Handle network errors with retry
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      console.log(`[${this.source}] Network timeout, retrying...`);
      
      if (this.backoff.shouldRetry(attempt)) {
        await this.backoff.wait(attempt);
        return this.makeRequest(requestFn, attempt + 1);
      }
    }

    // Return error response
    const errorMessage = axiosError.response?.data
      ? JSON.stringify(axiosError.response.data)
      : axiosError.message || 'Unknown error';

    console.error(`[${this.source}] Request failed:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      source: this.source,
      timestamp: new Date(),
    };
  }
}

/**
 * Tiki API Client
 */
export class TikiAPIClient extends BaseAPIClient {
  constructor(apiKeys: string | string[]) {
    super(
      process.env.TIKI_API_URL || 'https://api.tiki.vn',
      apiKeys,
      'tiki',
      {
        maxRequests: 100, // 100 requests per window
        windowMs: 60000, // 1 minute window
      }
    );
  }

  protected injectAPIKey(headers: any, apiKey: string): void {
    headers['X-API-Key'] = apiKey;
  }

  protected normalizeProduct(rawData: any): NormalizedProduct {
    return {
      externalId: rawData.id?.toString() || rawData.product_id?.toString() || '',
      name: rawData.name || rawData.title || '',
      description: rawData.description || rawData.short_description || '',
      brand: rawData.brand?.name || rawData.brand || '',
      model: rawData.model || '',
      price: parseFloat(rawData.price || rawData.list_price || 0),
      currency: 'VND',
      isAvailable: rawData.inventory_status === 'available' || rawData.stock_item?.qty > 0,
      images: this.extractImages(rawData),
      sourceUrl: rawData.url_path
        ? `https://tiki.vn/${rawData.url_path}`
        : rawData.url || '',
      source: 'tiki',
      specifications: rawData.specifications || rawData.attributes || {},
      metadata: {
        rating: rawData.rating_average || 0,
        reviewCount: rawData.review_count || 0,
        seller: rawData.seller?.name || '',
        originalPrice: parseFloat(rawData.original_price || rawData.list_price || 0),
      },
    };
  }

  private extractImages(rawData: any): string[] {
    const images: string[] = [];

    if (rawData.thumbnail_url) {
      images.push(rawData.thumbnail_url);
    }

    if (rawData.images && Array.isArray(rawData.images)) {
      images.push(...rawData.images.map((img: any) => img.base_url || img.url || img));
    }

    if (rawData.image_url) {
      images.push(rawData.image_url);
    }

    return [...new Set(images)]; // Remove duplicates
  }

  /**
   * Search products by keyword
   */
  async searchProducts(keyword: string, limit: number = 20): Promise<APIResponse<NormalizedProduct[]>> {
    return this.makeRequest(async () => {
      const response = await this.client.get('/v2/products', {
        params: {
          q: keyword,
          limit,
          include: 'sale_attrs,brand,specifications',
        },
      });

      const products = response.data?.data || response.data?.products || [];
      return products.map((product: any) => this.normalizeProduct(product));
    });
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<APIResponse<NormalizedProduct>> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/v2/products/${productId}`);
      return this.normalizeProduct(response.data);
    });
  }
}

/**
 * Lazada API Client
 */
export class LazadaAPIClient extends BaseAPIClient {
  constructor(apiKeys: string | string[]) {
    super(
      process.env.LAZADA_API_URL || 'https://api.lazada.vn',
      apiKeys,
      'lazada',
      {
        maxRequests: 50, // 50 requests per window
        windowMs: 60000, // 1 minute window
      }
    );
  }

  protected injectAPIKey(headers: any, apiKey: string): void {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  protected normalizeProduct(rawData: any): NormalizedProduct {
    return {
      externalId: rawData.itemId?.toString() || rawData.item_id?.toString() || '',
      name: rawData.name || rawData.title || '',
      description: rawData.description || '',
      brand: rawData.brand || '',
      model: rawData.model || '',
      price: parseFloat(rawData.price || rawData.salePrice || 0),
      currency: 'VND',
      isAvailable: rawData.available || rawData.quantity > 0,
      images: this.extractImages(rawData),
      sourceUrl: rawData.productUrl || rawData.url || '',
      source: 'lazada',
      specifications: rawData.attributes || {},
      metadata: {
        rating: rawData.ratingScore || 0,
        reviewCount: rawData.review || 0,
        seller: rawData.sellerName || '',
        originalPrice: parseFloat(rawData.originalPrice || rawData.price || 0),
      },
    };
  }

  private extractImages(rawData: any): string[] {
    const images: string[] = [];

    if (rawData.image) {
      images.push(rawData.image);
    }

    if (rawData.images && Array.isArray(rawData.images)) {
      images.push(...rawData.images);
    }

    if (rawData.pictures && Array.isArray(rawData.pictures)) {
      images.push(...rawData.pictures);
    }

    return [...new Set(images)]; // Remove duplicates
  }

  /**
   * Search products by keyword
   */
  async searchProducts(keyword: string, limit: number = 20): Promise<APIResponse<NormalizedProduct[]>> {
    return this.makeRequest(async () => {
      const response = await this.client.get('/products/search', {
        params: {
          q: keyword,
          limit,
        },
      });

      const products = response.data?.data?.products || response.data?.products || [];
      return products.map((product: any) => this.normalizeProduct(product));
    });
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<APIResponse<NormalizedProduct>> {
    return this.makeRequest(async () => {
      const response = await this.client.get(`/products/${productId}`);
      return this.normalizeProduct(response.data);
    });
  }
}

/**
 * Shopee API Client
 * Uses HMAC-SHA256 per-request signing via query params (Shopee Open Platform v2)
 */
export class ShopeeAPIClient extends BaseAPIClient {
  private readonly partnerId: string;
  private readonly partnerKey: string;

  constructor(partnerId: string, partnerKey: string) {
    super(
      process.env.SHOPEE_API_URL || 'https://partner.shopeemobile.com',
      `${partnerId}:${partnerKey}`,
      'shopee',
      { maxRequests: 100, windowMs: 60000 }
    );
    this.partnerId = partnerId;
    this.partnerKey = partnerKey;

    // Shopee requires HMAC-SHA256 signing injected as query params.
    // Request interceptors run LIFO, so this runs before the base injectAPIKey interceptor.
    this.client.interceptors.request.use((config) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const path = (config.url || '').split('?')[0];
      const baseString = `${this.partnerId}${path}${timestamp}`;
      const sign = createHmac('sha256', this.partnerKey).update(baseString).digest('hex');
      config.params = { ...config.params, partner_id: Number(this.partnerId), timestamp, sign };
      return config;
    });
  }

  // Shopee auth is via query param signature; no header key needed.
  protected injectAPIKey(_headers: any, _apiKey: string): void {}

  protected normalizeProduct(rawData: any): NormalizedProduct {
    const itemId = rawData.item_id?.toString() || rawData.itemid?.toString() || '';
    const shopId = rawData.shop_id?.toString() || '';
    return {
      externalId: itemId,
      name: rawData.item_name || rawData.name || '',
      description: rawData.description || '',
      brand: rawData.brand || '',
      model: rawData.tier_variation?.[0]?.name || '',
      // Shopee price is stored as actualVND * 100000
      price: (rawData.price_min || rawData.price || 0) / 100000,
      currency: 'VND',
      isAvailable: rawData.item_status === 'NORMAL' || (rawData.stock ?? 0) > 0,
      images: this.extractImages(rawData),
      sourceUrl: shopId && itemId ? `https://shopee.vn/product/${shopId}/${itemId}` : '',
      source: 'shopee',
      specifications: rawData.attributes?.reduce((acc: Record<string, string>, attr: any) => {
        acc[attr.attribute_name] = attr.attribute_value_list?.[0]?.attribute_value || '';
        return acc;
      }, {}) || {},
      metadata: {
        rating: rawData.item_rating?.rating_star || 0,
        reviewCount: rawData.item_rating?.rating_count?.[0] || 0,
        seller: rawData.shop_name || shopId,
        originalPrice: (rawData.price_max || rawData.price || 0) / 100000,
      },
    };
  }

  private extractImages(rawData: any): string[] {
    const hashes: string[] = rawData.image ?? rawData.images ?? [];
    return [...new Set(hashes.map((h: string) =>
      h.startsWith('http') ? h : `https://cf.shopee.vn/file/${h}`
    ))];
  }

  async searchProducts(keyword: string, limit: number = 20): Promise<APIResponse<NormalizedProduct[]>> {
    return this.makeRequest(async () => {
      const response = await this.client.get('/api/v2/product/search_item', {
        params: { keyword, limit },
      });
      const items = response.data?.response?.item || response.data?.items || [];
      return items.map((item: any) => this.normalizeProduct(item));
    });
  }

  async getProduct(productId: string): Promise<APIResponse<NormalizedProduct>> {
    return this.makeRequest(async () => {
      const [shopId, itemId] = productId.includes(':') ? productId.split(':') : [null, productId];
      const response = await this.client.get('/api/v2/product/get_item_base_info', {
        params: {
          item_id_list: itemId,
          ...(shopId ? { shop_id: shopId } : {}),
        },
      });
      const item = response.data?.response?.item_list?.[0] || response.data;
      return this.normalizeProduct(item);
    });
  }
}

/**
 * TikTok Shop API Client
 */
export class TikTokShopAPIClient extends BaseAPIClient {
  constructor(apiKeys: string | string[]) {
    super(
      process.env.TIKTOK_SHOP_API_URL || 'https://api.tiktokshop.com',
      apiKeys,
      'tiktok_shop',
      {
        maxRequests: 60, // 60 requests per window
        windowMs: 60000, // 1 minute window
      }
    );
  }

  protected injectAPIKey(headers: any, apiKey: string): void {
    headers['X-TikTok-API-Key'] = apiKey;
  }

  protected normalizeProduct(rawData: any): NormalizedProduct {
    return {
      externalId: rawData.product_id?.toString() || rawData.id?.toString() || '',
      name: rawData.product_name || rawData.title || '',
      description: rawData.description || '',
      brand: rawData.brand_name || '',
      model: rawData.model || '',
      price: parseFloat(rawData.price || rawData.sale_price || 0),
      currency: 'VND',
      isAvailable: rawData.status === 'ACTIVE' || rawData.stock > 0,
      images: this.extractImages(rawData),
      sourceUrl: rawData.product_url || rawData.url || '',
      source: 'tiktok_shop',
      specifications: rawData.attributes || rawData.specs || {},
      metadata: {
        rating: rawData.rating || 0,
        reviewCount: rawData.review_count || 0,
        seller: rawData.shop_name || '',
        originalPrice: parseFloat(rawData.original_price || rawData.price || 0),
      },
    };
  }

  private extractImages(rawData: any): string[] {
    const images: string[] = [];

    if (rawData.main_image) {
      images.push(rawData.main_image);
    }

    if (rawData.images && Array.isArray(rawData.images)) {
      images.push(...rawData.images.map((img: any) => img.url || img));
    }

    if (rawData.image_urls && Array.isArray(rawData.image_urls)) {
      images.push(...rawData.image_urls);
    }

    return [...new Set(images)]; // Remove duplicates
  }

  /**
   * Search products by keyword
   */
  async searchProducts(keyword: string, limit: number = 20): Promise<APIResponse<NormalizedProduct[]>> {
    return this.makeRequest(async () => {
      const response = await this.client.get('/product/search', {
        params: {
          keyword,
          page_size: limit,
        },
      });

      const products = response.data?.data?.products || response.data?.products || [];
      return products.map((product: any) => this.normalizeProduct(product));
    });
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<APIResponse<NormalizedProduct>> {
    return this.makeRequest(async () => {
      const response = await this.client.get('/product/detail', {
        params: {
          product_id: productId,
        },
      });
      return this.normalizeProduct(response.data?.data || response.data);
    });
  }
}

/**
 * API Integrator Service
 * Coordinates API calls across multiple platforms with fallback support
 */
export class APIIntegratorService {
  private tikiClient?: TikiAPIClient;
  private lazadaClient?: LazadaAPIClient;
  private shopeeClient?: ShopeeAPIClient;
  private tiktokClient?: TikTokShopAPIClient;

  constructor() {
    if (process.env.TIKI_API_KEY) {
      this.tikiClient = new TikiAPIClient(process.env.TIKI_API_KEY);
    }

    if (process.env.LAZADA_API_KEY) {
      this.lazadaClient = new LazadaAPIClient(process.env.LAZADA_API_KEY);
    }

    if (process.env.SHOPEE_PARTNER_ID && process.env.SHOPEE_PARTNER_KEY) {
      this.shopeeClient = new ShopeeAPIClient(
        process.env.SHOPEE_PARTNER_ID,
        process.env.SHOPEE_PARTNER_KEY
      );
    }

    if (process.env.TIKTOK_SHOP_API_KEY) {
      this.tiktokClient = new TikTokShopAPIClient(process.env.TIKTOK_SHOP_API_KEY);
    }
  }

  async searchAllPlatforms(
    keyword: string,
    limit: number = 20
  ): Promise<{
    tiki?: APIResponse<NormalizedProduct[]>;
    lazada?: APIResponse<NormalizedProduct[]>;
    shopee?: APIResponse<NormalizedProduct[]>;
    tiktok?: APIResponse<NormalizedProduct[]>;
  }> {
    const results: any = {};
    const promises: Promise<void>[] = [];

    if (this.tikiClient) {
      promises.push(this.tikiClient.searchProducts(keyword, limit).then((r) => { results.tiki = r; }));
    }
    if (this.lazadaClient) {
      promises.push(this.lazadaClient.searchProducts(keyword, limit).then((r) => { results.lazada = r; }));
    }
    if (this.shopeeClient) {
      promises.push(this.shopeeClient.searchProducts(keyword, limit).then((r) => { results.shopee = r; }));
    }
    if (this.tiktokClient) {
      promises.push(this.tiktokClient.searchProducts(keyword, limit).then((r) => { results.tiktok = r; }));
    }

    await Promise.allSettled(promises);
    return results;
  }

  async getProduct(
    platform: 'tiki' | 'lazada' | 'shopee' | 'tiktok_shop',
    productId: string
  ): Promise<APIResponse<NormalizedProduct>> {
    switch (platform) {
      case 'tiki':
        if (!this.tikiClient) return this.notInitialized('tiki');
        return this.tikiClient.getProduct(productId);

      case 'lazada':
        if (!this.lazadaClient) return this.notInitialized('lazada');
        return this.lazadaClient.getProduct(productId);

      case 'shopee':
        if (!this.shopeeClient) return this.notInitialized('shopee');
        return this.shopeeClient.getProduct(productId);

      case 'tiktok_shop':
        if (!this.tiktokClient) return this.notInitialized('tiktok_shop');
        return this.tiktokClient.getProduct(productId);

      default:
        return { success: false, error: `Unknown platform: ${platform}`, source: platform, timestamp: new Date() };
    }
  }

  async getAllProducts(keyword: string, limit: number = 20): Promise<NormalizedProduct[]> {
    const results = await this.searchAllPlatforms(keyword, limit);
    const all: NormalizedProduct[] = [];
    if (results.tiki?.success && results.tiki.data) all.push(...results.tiki.data);
    if (results.lazada?.success && results.lazada.data) all.push(...results.lazada.data);
    if (results.shopee?.success && results.shopee.data) all.push(...results.shopee.data);
    if (results.tiktok?.success && results.tiktok.data) all.push(...results.tiktok.data);
    return all;
  }

  hasAvailableClients(): boolean {
    return !!(this.tikiClient || this.lazadaClient || this.shopeeClient || this.tiktokClient);
  }

  getAvailablePlatforms(): string[] {
    const platforms: string[] = [];
    if (this.tikiClient) platforms.push('tiki');
    if (this.lazadaClient) platforms.push('lazada');
    if (this.shopeeClient) platforms.push('shopee');
    if (this.tiktokClient) platforms.push('tiktok_shop');
    return platforms;
  }

  private notInitialized(source: string): APIResponse<NormalizedProduct> {
    return { success: false, error: `${source} API client not initialized`, source, timestamp: new Date() };
  }
}

// Export singleton instance
export const apiIntegratorService = new APIIntegratorService();
