/**
 * Price Comparison Service
 * Handles price aggregation, comparison, history, and best deals
 */

import {
  PriceEntry,
  PriceComparison,
  PriceHistory,
  PriceHistoryEntry,
  Deal,
  PriceUpdateResult,
} from '@price-comparison/types';
import { pool, queryRead } from '../config/database';

export class PriceComparisonService {
  /**
   * Get product prices from all sources
   */
  async getProductPrices(productId: string): Promise<PriceComparison> {
    // Get product info — accept either ULID id or slug
    const productQuery = `
      SELECT id, slug, name FROM products WHERE (id = $1 OR slug = $1) AND is_active = true
    `;
    const productResult = await queryRead(productQuery, [productId]);

    if (productResult.rows.length === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const product = productResult.rows[0];
    const resolvedId = product.id;

    // Get all price entries for this product
    const pricesQuery = `
      SELECT
        id,
        product_id,
        source_name AS source,
        source_url,
        price,
        currency,
        is_available,
        scraped_at,
        metadata
      FROM price_entries
      WHERE product_id = $1
      ORDER BY price ASC, scraped_at DESC
    `;

    const pricesResult = await queryRead(pricesQuery, [resolvedId]);
    
    const prices: PriceEntry[] = pricesResult.rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      source: row.source,
      sourceUrl: row.source_url,
      price: parseFloat(row.price),
      currency: row.currency,
      isAvailable: row.is_available,
      scrapedAt: new Date(row.scraped_at),
      metadata: row.metadata,
    }));
    
    // Filter only available prices
    const availablePrices = prices.filter(p => p.isAvailable);
    
    // Calculate statistics
    let lowestPrice: PriceEntry | undefined;
    let highestPrice: PriceEntry | undefined;
    let averagePrice = 0;
    let priceRange = { min: 0, max: 0 };
    
    if (availablePrices.length > 0) {
      lowestPrice = availablePrices[0]; // Already sorted by price ASC
      highestPrice = availablePrices[availablePrices.length - 1];
      
      const sum = availablePrices.reduce((acc, p) => acc + p.price, 0);
      averagePrice = sum / availablePrices.length;
      
      priceRange = {
        min: lowestPrice.price,
        max: highestPrice.price,
      };
    }
    
    // Get last update time
    const lastUpdated = prices.length > 0
      ? new Date(Math.max(...prices.map(p => p.scrapedAt.getTime())))
      : new Date();
    
    return {
      productId: resolvedId,
      productName: product.name,
      prices,
      lowestPrice,
      highestPrice,
      averagePrice,
      priceRange,
      lastUpdated,
      availableSources: availablePrices.length,
    };
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(
    productId: string,
    source?: string,
    days: number = 30
  ): Promise<PriceHistory> {
    // Verify product exists — accept either id or slug
    const productCheck = await queryRead(
      'SELECT id FROM products WHERE id = $1 OR slug = $1',
      [productId]
    );

    if (productCheck.rows.length === 0) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const resolvedId = productCheck.rows[0].id;

    // Build query
    const conditions = ['product_id = $1', 'scraped_at >= NOW() - INTERVAL \'1 day\' * $2'];
    const params: any[] = [resolvedId, days];
    let paramIndex = 3;
    
    if (source) {
      conditions.push(`source_name = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get price history
    const historyQuery = `
      SELECT
        DATE(scraped_at) as date,
        source_name AS source,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        BOOL_OR(is_available) as is_available
      FROM price_entries
      WHERE ${whereClause}
      GROUP BY DATE(scraped_at), source_name
      ORDER BY date ASC, source_name ASC
    `;
    
    const historyResult = await queryRead(historyQuery, params);
    
    // Group by source
    const entriesBySource: { [source: string]: PriceHistoryEntry[] } = {};
    
    for (const row of historyResult.rows) {
      const sourceName = row.source;
      if (!entriesBySource[sourceName]) {
        entriesBySource[sourceName] = [];
      }
      
      entriesBySource[sourceName].push({
        date: new Date(row.date),
        price: parseFloat(row.avg_price),
        isAvailable: row.is_available,
      });
    }
    
    // If specific source requested, return only that source
    if (source && entriesBySource[source]) {
      const entries = entriesBySource[source];
      const trend = this.calculateTrend(entries);
      const { lowestEver, highestEver } = this.calculateExtremes(entries);
      
      return {
        productId: resolvedId,
        source,
        entries,
        trend,
        lowestEver,
        highestEver,
      };
    }
    
    // Otherwise, return combined history from all sources
    const allEntries: PriceHistoryEntry[] = [];
    for (const entries of Object.values(entriesBySource)) {
      allEntries.push(...entries);
    }
    
    // Sort by date
    allEntries.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const trend = this.calculateTrend(allEntries);
    const { lowestEver, highestEver } = this.calculateExtremes(allEntries);
    
    return {
      productId: resolvedId,
      source: source || 'all',
      entries: allEntries,
      trend,
      lowestEver,
      highestEver,
    };
  }

  /**
   * Get best deals (products with significant discounts)
   */
  async getBestDeals(
    categoryId?: number,
    limit: number = 20,
    minDiscountPercent: number = 10
  ): Promise<Deal[]> {
    const params: any[] = [minDiscountPercent];
    let paramIndex = 2;

    let categoryFilter = '';
    if (categoryId) {
      categoryFilter = `AND EXISTS (
        SELECT 1 FROM product_categories pc2
        WHERE pc2.product_id = p.id AND pc2.category_id = $${paramIndex}
      )`;
      params.push(categoryId);
      paramIndex++;
    }

    params.push(limit);

    const dealsQuery = `
      WITH cheapest AS (
        SELECT DISTINCT ON (product_id)
          product_id,
          price        AS current_price,
          source_name  AS source,
          source_url
        FROM price_entries
        WHERE is_available = true
          AND scraped_at >= NOW() - INTERVAL '7 days'
        ORDER BY product_id, price ASC
      ),
      expensive AS (
        SELECT product_id, MAX(price) AS original_price
        FROM price_entries
        WHERE is_available = true
          AND scraped_at >= NOW() - INTERVAL '7 days'
        GROUP BY product_id
        HAVING MAX(price) > MIN(price) * (1 + $1 / 100.0)
      ),
      product_categories_agg AS (
        SELECT
          pc.product_id,
          MIN(c.id::text)  AS category_id,
          MIN(c.name_vi)   AS category_name
        FROM product_categories pc
        INNER JOIN categories c ON pc.category_id = c.id
        GROUP BY pc.product_id
      )
      SELECT
        p.id              AS product_id,
        p.slug            AS product_slug,
        p.name            AS product_name,
        p.images[1]       AS product_image,
        pca.category_id,
        pca.category_name,
        exp.original_price,
        ch.current_price,
        exp.original_price - ch.current_price                              AS discount,
        (exp.original_price - ch.current_price) / exp.original_price * 100 AS discount_percentage,
        ch.source,
        ch.source_url
      FROM products p
      INNER JOIN expensive exp ON p.id = exp.product_id
      INNER JOIN cheapest  ch  ON p.id = ch.product_id
      LEFT  JOIN product_categories_agg pca ON p.id = pca.product_id
      WHERE p.is_active = true
      ${categoryFilter}
      ORDER BY discount_percentage DESC, discount DESC
      LIMIT $${paramIndex}
    `;

    const dealsResult = await queryRead(dealsQuery, params);

    return dealsResult.rows.map(row => ({
      productId: row.product_id,
      slug: row.product_slug,
      productName: row.product_name,
      productImage: row.product_image || '',
      categoryId: row.category_id,
      categoryName: row.category_name,
      originalPrice: parseFloat(row.original_price),
      currentPrice: parseFloat(row.current_price),
      discount: parseFloat(row.discount),
      discountPercentage: parseFloat(row.discount_percentage),
      source: row.source,
      sourceUrl: row.source_url,
      scrapedAt: new Date(),
    }));
  }

  /**
   * Update prices for a product (called by scraper)
   */
  async updatePrices(
    productId: string,
    prices: Array<{
      source: string;
      sourceUrl: string;
      price: number;
      currency: string;
      isAvailable: boolean;
      metadata?: Record<string, any>;
    }>
  ): Promise<PriceUpdateResult> {
    const client = await pool.connect();
    let updatedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    try {
      await client.query('BEGIN');
      
      // Verify product exists
      const productCheck = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      );
      
      if (productCheck.rows.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      // Insert new price entries
      for (const priceData of prices) {
        try {
          await client.query(
            `INSERT INTO price_entries (product_id, source_name, source_url, price, currency, is_available, metadata, scraped_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              productId,
              priceData.source,
              priceData.sourceUrl,
              priceData.price,
              priceData.currency,
              priceData.isAvailable,
              priceData.metadata ? JSON.stringify(priceData.metadata) : null,
            ]
          );
          updatedCount++;
        } catch (error: any) {
          failedCount++;
          errors.push(`${priceData.source}: ${error.message}`);
        }
      }
      
      await client.query('COMMIT');
      
      return {
        success: failedCount === 0,
        updatedCount,
        failedCount,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date(),
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get price statistics for a product
   */
  async getPriceStatistics(productId: string): Promise<{
    currentLowest: number;
    currentHighest: number;
    currentAverage: number;
    historicalLowest: number;
    historicalHighest: number;
    priceVolatility: number;
  }> {
    const query = `
      WITH current_prices AS (
        SELECT price
        FROM price_entries
        WHERE product_id = $1
          AND is_available = true
          AND scraped_at >= NOW() - INTERVAL '24 hours'
      ),
      historical_prices AS (
        SELECT price
        FROM price_entries
        WHERE product_id = $1
          AND is_available = true
      )
      SELECT
        (SELECT MIN(price) FROM current_prices) as current_lowest,
        (SELECT MAX(price) FROM current_prices) as current_highest,
        (SELECT AVG(price) FROM current_prices) as current_average,
        (SELECT MIN(price) FROM historical_prices) as historical_lowest,
        (SELECT MAX(price) FROM historical_prices) as historical_highest,
        (SELECT STDDEV(price) FROM historical_prices) as price_stddev,
        (SELECT AVG(price) FROM historical_prices) as historical_average
    `;
    
    const result = await queryRead(query, [productId]);
    const row = result.rows[0];
    
    // Calculate volatility (coefficient of variation)
    const priceVolatility = row.historical_average > 0
      ? (parseFloat(row.price_stddev) / parseFloat(row.historical_average)) * 100
      : 0;
    
    return {
      currentLowest: parseFloat(row.current_lowest) || 0,
      currentHighest: parseFloat(row.current_highest) || 0,
      currentAverage: parseFloat(row.current_average) || 0,
      historicalLowest: parseFloat(row.historical_lowest) || 0,
      historicalHighest: parseFloat(row.historical_highest) || 0,
      priceVolatility,
    };
  }

  // Private helper methods

  private calculateTrend(entries: PriceHistoryEntry[]): 'increasing' | 'decreasing' | 'stable' {
    if (entries.length < 2) {
      return 'stable';
    }
    
    // Compare first half average with second half average
    const midPoint = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, midPoint);
    const secondHalf = entries.slice(midPoint);
    
    const firstAvg = firstHalf.reduce((sum, e) => sum + e.price, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + e.price, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (changePercent > 5) return 'increasing';
    if (changePercent < -5) return 'decreasing';
    return 'stable';
  }

  private calculateExtremes(entries: PriceHistoryEntry[]): {
    lowestEver?: number;
    highestEver?: number;
  } {
    if (entries.length === 0) {
      return {};
    }
    
    const prices = entries.map(e => e.price);
    return {
      lowestEver: Math.min(...prices),
      highestEver: Math.max(...prices),
    };
  }
}

// Export singleton instance
export const priceComparisonService = new PriceComparisonService();
