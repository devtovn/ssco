/**
 * Data Collection Service
 * Coordinates API integration, web scraping, validation, and PostgreSQL storage
 */

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  APIIntegratorService,
  apiIntegratorService,
  NormalizedProduct,
} from './APIIntegratorService';
import { WebScraperService, webScraperService } from './WebScraperService';
import {
  CollectionJobType,
  DataCollectionQueue,
  getDataCollectionQueue,
  JobProcessingResult,
} from './DataCollectionQueue';
import { Job } from 'bull';

export interface CollectionResult {
  success: boolean;
  collectedCount: number;
  storedCount: number;
  failedCount: number;
  usedScrapingFallback: boolean;
  errors: string[];
  timestamp: Date;
}

export interface ScrapingResult {
  success: boolean;
  collectedCount: number;
  storedCount: number;
  failedCount: number;
  captchaCount: number;
  errors: string[];
  timestamp: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  normalized?: NormalizedProduct;
}

export interface PriceSource {
  id: string;
  name: string;
  sourceType: 'api' | 'scrape';
  platform: string;
  baseUrl: string | null;
  isActive: boolean;
  reliabilityScore: number;
}

const DEFAULT_CATEGORY = 'general';

export class DataCollectionService {
  constructor(
    private pool: Pool,
    private apiIntegrator: APIIntegratorService = apiIntegratorService,
    private webScraper: WebScraperService = webScraperService,
    private queue?: DataCollectionQueue
  ) {}

  /**
   * Collect products from APIs with web scraping fallback
   */
  async collectFromAPIs(keywords: string[]): Promise<CollectionResult> {
    const errors: string[] = [];
    let collected: NormalizedProduct[] = [];
    let usedScrapingFallback = false;

    for (const keyword of keywords) {
      try {
        let products = await this.apiIntegrator.getAllProducts(keyword, 20);

        if (products.length === 0) {
          products = await this.collectViaScrapingFallback(keyword);
          if (products.length > 0) {
            usedScrapingFallback = true;
          }
        }

        collected = collected.concat(products);
        await this.recordSourceSuccess('api', this.apiIntegrator.getAvailablePlatforms().join(','));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`API collection for "${keyword}": ${message}`);
        await this.recordSourceFailure('api', message);

        try {
          const fallbackProducts = await this.collectViaScrapingFallback(keyword);
          collected = collected.concat(fallbackProducts);
          if (fallbackProducts.length > 0) usedScrapingFallback = true;
        } catch (scrapeError: unknown) {
          const scrapeMsg =
            scrapeError instanceof Error ? scrapeError.message : String(scrapeError);
          errors.push(`Scraping fallback for "${keyword}": ${scrapeMsg}`);
        }
      }
    }

    const validProducts = collected.filter((p) => {
      const validation = this.validateProductData(p);
      return validation.valid;
    });

    const storeResult = await this.storeProducts(validProducts);

    return {
      success: storeResult.storedCount > 0 || validProducts.length === 0,
      collectedCount: collected.length,
      storedCount: storeResult.storedCount,
      failedCount: collected.length - storeResult.storedCount,
      usedScrapingFallback,
      errors: [...errors, ...storeResult.errors],
      timestamp: new Date(),
    };
  }

  /**
   * Scrape product data from URLs
   */
  async scrapeWebsites(urls: string[]): Promise<ScrapingResult> {
    const errors: string[] = [];
    const batch = await this.webScraper.scrapeUrls(urls);

    const validProducts: NormalizedProduct[] = [];

    for (const result of batch.results) {
      if (!result.success || !result.data) {
        if (result.error) errors.push(`${result.url}: ${result.error}`);
        continue;
      }

      const validation = this.validateProductData(result.data);
      if (validation.valid && validation.normalized) {
        validProducts.push(validation.normalized);
      } else {
        errors.push(`${result.url}: ${validation.errors.join(', ')}`);
      }
    }

    const storeResult = await this.storeProducts(validProducts);

    if (batch.successCount > 0) {
      await this.recordSourceSuccess('scrape', 'web');
    } else if (urls.length > 0) {
      await this.recordSourceFailure('scrape', errors[0] || 'All scrapes failed');
    }

    return {
      success: storeResult.storedCount > 0,
      collectedCount: batch.successCount,
      storedCount: storeResult.storedCount,
      failedCount: batch.failedCount,
      captchaCount: batch.captchaCount,
      errors: [...errors, ...storeResult.errors],
      timestamp: new Date(),
    };
  }

  /**
   * Validate and normalize product data
   */
  validateProductData(data: NormalizedProduct): ValidationResult {
    const scraperValidation = this.webScraper.validateProduct(data);
    if (!scraperValidation.valid) {
      return { valid: false, errors: scraperValidation.errors };
    }

    const normalized: NormalizedProduct = {
      ...data,
      name: data.name.trim(),
      currency: data.currency || 'VND',
      images: data.images?.filter(Boolean) || [],
      isAvailable: data.isAvailable ?? true,
    };

    return { valid: true, errors: [], normalized };
  }

  /**
   * Schedule periodic data collection via Bull Queue
   */
  async scheduleCollection(cron?: string): Promise<void> {
    const queue = this.queue ?? getDataCollectionQueue();
    await queue.scheduleCollection(cron);
  }

  /**
   * Register Bull queue processor and optionally start scheduler
   */
  initializeQueue(enableScheduler = true): DataCollectionQueue {
    const queue = this.queue ?? getDataCollectionQueue();

    queue.registerProcessor(async (job) => this.processJob(job));

    if (enableScheduler && process.env.DATA_COLLECTION_SCHEDULER_ENABLED !== 'false') {
      void this.scheduleCollection();
    }

    this.queue = queue;
    return queue;
  }

  /**
   * Process a Bull queue job
   */
  async processJob(job: Job): Promise<JobProcessingResult> {
    const type = job.name as CollectionJobType;

    try {
      switch (type) {
        case CollectionJobType.API_COLLECTION: {
          const { keywords } = job.data as { keywords: string[] };
          const result = await this.collectFromAPIs(keywords);
          return {
            jobId: job.id,
            type,
            success: result.success,
            message: `Collected ${result.collectedCount}, stored ${result.storedCount}`,
          };
        }

        case CollectionJobType.WEB_SCRAPING: {
          const { urls } = job.data as { urls: string[] };
          const result = await this.scrapeWebsites(urls);
          return {
            jobId: job.id,
            type,
            success: result.success,
            message: `Scraped ${result.collectedCount}, stored ${result.storedCount}`,
          };
        }

        case CollectionJobType.FULL_COLLECTION: {
          const { keywords, urls } = job.data as { keywords: string[]; urls?: string[] };
          const apiResult = await this.collectFromAPIs(keywords);
          let scrapeResult: ScrapingResult | null = null;

          if (urls && urls.length > 0) {
            scrapeResult = await this.scrapeWebsites(urls);
          }

          const success =
            apiResult.success || (scrapeResult?.success ?? false) || apiResult.collectedCount > 0;

          return {
            jobId: job.id,
            type,
            success,
            message: `Full: API stored ${apiResult.storedCount}, scrape stored ${scrapeResult?.storedCount ?? 0}`,
          };
        }

        default:
          return {
            jobId: job.id,
            type,
            success: false,
            message: `Unknown job type: ${type}`,
          };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[DataCollectionService] Job ${job.id} error:`, message);
      throw error;
    }
  }

  /**
   * Get active price sources from database
   */
  async getActivePriceSources(): Promise<PriceSource[]> {
    const result = await this.pool.query(
      `SELECT id, name, source_type, platform, base_url, is_active, reliability_score
       FROM price_sources
       WHERE is_active = true
       ORDER BY reliability_score DESC, name ASC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      sourceType: row.source_type,
      platform: row.platform,
      baseUrl: row.base_url,
      isActive: row.is_active,
      reliabilityScore: parseFloat(row.reliability_score),
    }));
  }

  /**
   * Store validated products in PostgreSQL
   */
  async storeProducts(
    products: NormalizedProduct[]
  ): Promise<{ storedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let storedCount = 0;

    for (const product of products) {
      try {
        await this.upsertProductWithPrice(product);
        storedCount++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${product.name}: ${message}`);
      }
    }

    return { storedCount, errors };
  }

  private async collectViaScrapingFallback(keyword: string): Promise<NormalizedProduct[]> {
    const sources = await this.getActivePriceSources();
    const scrapeSources = sources.filter((s) => s.sourceType === 'scrape');
    const products: NormalizedProduct[] = [];

    for (const source of scrapeSources) {
      const searchUrl = this.webScraper.buildSearchUrl(source.platform, keyword);
      if (!searchUrl) continue;

      const result = await this.webScraper.scrapeUrl(searchUrl);
      if (result.success && result.data) {
        products.push(result.data);
      }
    }

    return products;
  }

  private async upsertProductWithPrice(product: NormalizedProduct): Promise<string> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT p.id FROM products p
         INNER JOIN price_entries pe ON pe.product_id = p.id
         WHERE pe.source_name = $1 AND pe.metadata->>'externalId' = $2
         LIMIT 1`,
        [product.source, product.externalId]
      );

      let productId: string;

      if (existing.rows.length > 0) {
        productId = existing.rows[0].id;

        await client.query(
          `UPDATE products SET
            name = $1, brand = $2, description = $3, images = $4,
            updated_at = NOW()
           WHERE id = $5`,
          [
            product.name,
            product.brand || null,
            product.description || null,
            product.images.length > 0 ? product.images : null,
            productId,
          ]
        );
      } else {
        const insertResult = await client.query(
          `INSERT INTO products (name, description, category, brand, model, specifications, images, keywords)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            product.name,
            product.description || null,
            DEFAULT_CATEGORY,
            product.brand || null,
            product.model || null,
            product.specifications ? JSON.stringify(product.specifications) : null,
            product.images.length > 0 ? product.images : null,
            product.name.split(' ').slice(0, 5),
          ]
        );
        productId = insertResult.rows[0].id;
      }

      await client.query(
        `INSERT INTO price_entries (product_id, source_name, source_url, price, currency, is_available, metadata, scraped_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          productId,
          product.source,
          product.sourceUrl,
          product.price,
          product.currency || 'VND',
          product.isAvailable,
          JSON.stringify({
            externalId: product.externalId,
            ...product.metadata,
          }),
        ]
      );

      await client.query('COMMIT');
      return productId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async recordSourceSuccess(
    sourceType: string,
    platform: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE price_sources SET
        last_success_at = NOW(),
        failure_count = 0,
        reliability_score = LEAST(reliability_score + 0.05, 1.0),
        updated_at = NOW()
       WHERE source_type = $1 AND ($2 = '' OR platform = $2)`,
      [sourceType, platform.split(',')[0] || '']
    );
  }

  private async recordSourceFailure(
    sourceType: string,
    _error: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE price_sources SET
        last_failure_at = NOW(),
        failure_count = failure_count + 1,
        reliability_score = GREATEST(reliability_score - 0.1, 0.1),
        updated_at = NOW()
       WHERE source_type = $1`,
      [sourceType]
    );
  }
}

export const dataCollectionService = new DataCollectionService(pool);
