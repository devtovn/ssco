/**
 * Search Service
 * Handles product search with full-text search, fuzzy matching, filters, and analytics
 */

import {
  SearchQuery,
  SearchResult,
  SearchResponse,
  SearchSuggestion,
  PopularKeyword,
  SortBy,
} from '@price-comparison/types';
import { pool, queryRead } from '../config/database';
import { hashQuery } from '../utils/hashQuery';

export class SearchService {
  /**
   * Search products with fuzzy matching and filters
   */
  async searchProducts(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    const {
      keyword,
      categoryId,
      priceRange,
      brand,
      sortBy = 'relevance',
      page = 1,
      limit = 20,
    } = query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['p.is_active = true'];
    const params: any[] = [];
    let paramIndex = 1;

    // Full-text search with fuzzy matching
    if (keyword && keyword.trim()) {
      const searchTerm = keyword.trim();
      
      // Use both full-text search and trigram similarity
      conditions.push(`(
        p.name_tsvector @@ plainto_tsquery('vietnamese', unaccent($${paramIndex}))
        OR p.keywords_tsvector @@ plainto_tsquery('vietnamese', unaccent($${paramIndex}))
        OR similarity(p.name, $${paramIndex}) > 0.3
        OR p.name ILIKE $${paramIndex + 1}
      )`);
      params.push(searchTerm, `%${searchTerm}%`);
      paramIndex += 2;
    }

    // Category filter
    if (categoryId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM product_categories pc
        WHERE pc.product_id = p.id AND pc.category_id = $${paramIndex}
      )`);
      params.push(categoryId);
      paramIndex++;
    }

    // Price range filter
    if (priceRange) {
      conditions.push(`EXISTS (
        SELECT 1 FROM price_entries pe
        WHERE pe.product_id = p.id
          AND pe.price >= $${paramIndex}
          AND pe.price <= $${paramIndex + 1}
          AND pe.is_available = true
      )`);
      params.push(priceRange.min, priceRange.max);
      paramIndex += 2;
    }

    // Brand filter
    if (brand) {
      conditions.push(`p.brand ILIKE $${paramIndex}`);
      params.push(`%${brand}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Build ORDER BY clause
    let orderByClause = '';
    switch (sortBy) {
      case 'relevance':
        if (keyword && keyword.trim()) {
          orderByClause = `
            ts_rank(p.name_tsvector, plainto_tsquery('vietnamese', unaccent($1))) +
            ts_rank(p.keywords_tsvector, plainto_tsquery('vietnamese', unaccent($1))) +
            similarity(p.name, $1) DESC,
            p.created_at DESC
          `;
        } else {
          orderByClause = 'p.created_at DESC';
        }
        break;
      case 'price_asc':
        orderByClause = 'min_price ASC NULLS LAST, p.name ASC';
        break;
      case 'price_desc':
        orderByClause = 'min_price DESC NULLS LAST, p.name ASC';
        break;
      case 'popularity':
        // TODO: Add view count from analytics
        orderByClause = 'p.created_at DESC';
        break;
      case 'newest':
        orderByClause = 'p.created_at DESC';
        break;
      default:
        orderByClause = 'p.created_at DESC';
    }

    // Main search query — uses materialized view cheapest_prices to avoid full scan
    const searchQuery = `
      WITH product_prices AS (
        SELECT
          pe.product_id,
          MIN(pe.price)            AS min_price,
          MAX(pe.price)            AS max_price,
          AVG(pe.price)            AS avg_price,
          cp.source_name           AS lowest_source,
          cp.source_url            AS lowest_source_url,
          true                     AS is_available
        FROM cheapest_prices cp
        JOIN price_entries pe ON pe.product_id = cp.product_id
          AND pe.is_available = true
          AND pe.scraped_at >= NOW() - INTERVAL '30 days'
        GROUP BY pe.product_id, cp.source_name, cp.source_url
      ),
      product_categories_agg AS (
        SELECT
          pc.product_id,
          MIN(c.id::text) AS category_id,
          MIN(c.name_vi)  AS category_name
        FROM product_categories pc
        INNER JOIN categories c ON pc.category_id = c.id
        GROUP BY pc.product_id
      )
      SELECT
        p.id,
        p.slug,
        p.name,
        p.description,
        p.brand,
        p.images,
        pca.category_id,
        pca.category_name,
        pp.min_price AS lowest_price,
        pp.max_price AS highest_price,
        pp.avg_price AS average_price,
        pp.lowest_source AS source,
        pp.lowest_source_url AS source_url,
        COALESCE(pp.is_available, false) AS is_available,
        ${keyword && keyword.trim() ? `
          ts_rank(p.name_tsvector, plainto_tsquery('vietnamese', unaccent($1))) +
          ts_rank(p.keywords_tsvector, plainto_tsquery('vietnamese', unaccent($1))) +
          similarity(p.name, $1) as relevance_score
        ` : '0 as relevance_score'}
      FROM products p
      LEFT JOIN product_prices pp ON p.id = pp.product_id
      LEFT JOIN product_categories_agg pca ON p.id = pca.product_id
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countParams = [...params]; // snapshot before adding limit/offset
    params.push(limit, offset);

    // Execute search
    const searchResult = await queryRead(searchQuery, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      WHERE ${whereClause}
    `;

    const countResult = await queryRead(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Map results
    const results: SearchResult[] = searchResult.rows.map(row => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      categoryName: row.category_name || 'Uncategorized',
      brand: row.brand,
      images: row.images || [],
      priceRange: {
        min: row.lowest_price || 0,
        max: row.highest_price || 0,
      },
      lowestPrice: row.lowest_price,
      averagePrice: row.average_price,
      source: row.source,
      sourceUrl: row.source_url,
      relevanceScore: parseFloat(row.relevance_score) || 0,
      isAvailable: row.is_available,
    }));

    // Get filter aggregations
    const filters = await this.getFilterAggregations(keyword, categoryId, brand);

    const searchTime = Date.now() - startTime;

    // Track search for analytics
    await this.trackSearch(query, results.length, searchTime);

    return {
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters,
      searchTime,
    };
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    const suggestions: SearchSuggestion[] = [];

    // Get product name suggestions
    const productQuery = `
      SELECT
        name as text,
        'product' as type,
        similarity(name, $1) as score,
        id as product_id
      FROM products
      WHERE is_active = true
        AND (
          name ILIKE $2
          OR similarity(name, $1) > 0.3
        )
      ORDER BY score DESC, name ASC
      LIMIT $3
    `;

    const productResult = await queryRead(productQuery, [searchTerm, `%${searchTerm}%`, limit]);

    suggestions.push(...productResult.rows.map(row => ({
      text: row.text,
      type: 'product' as const,
      score: parseFloat(row.score),
      metadata: {
        productId: row.product_id,
      },
    })));

    // Get category suggestions
    const categoryQuery = `
      SELECT
        name_vi as text,
        'category' as type,
        similarity(name_vi, $1) as score,
        id as category_id
      FROM categories
      WHERE is_active = true
        AND (
          name_vi ILIKE $2
          OR similarity(name_vi, $1) > 0.3
        )
      ORDER BY score DESC, name_vi ASC
      LIMIT $3
    `;

    const categoryResult = await queryRead(categoryQuery, [searchTerm, `%${searchTerm}%`, Math.floor(limit / 2)]);

    suggestions.push(...categoryResult.rows.map(row => ({
      text: row.text,
      type: 'category' as const,
      score: parseFloat(row.score),
      metadata: {
        categoryId: row.category_id,
      },
    })));

    // Get brand suggestions
    const brandQuery = `
      SELECT DISTINCT
        brand as text,
        'brand' as type,
        similarity(brand, $1) as score,
        COUNT(*) as count
      FROM products
      WHERE is_active = true
        AND brand IS NOT NULL
        AND (
          brand ILIKE $2
          OR similarity(brand, $1) > 0.3
        )
      GROUP BY brand
      ORDER BY score DESC, count DESC
      LIMIT $3
    `;

    const brandResult = await queryRead(brandQuery, [searchTerm, `%${searchTerm}%`, Math.floor(limit / 3)]);

    suggestions.push(...brandResult.rows.map(row => ({
      text: row.text,
      type: 'brand' as const,
      score: parseFloat(row.score),
      metadata: {
        count: parseInt(row.count),
      },
    })));

    // Sort by score and return top results
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get popular keywords
   */
  async getPopularKeywords(limit: number = 10): Promise<PopularKeyword[]> {
    const query = `
      SELECT
        query as keyword,
        COUNT(*) as search_count,
        MAX(searched_at) as last_searched_at
      FROM search_logs
      WHERE searched_at >= NOW() - INTERVAL '7 days'
      GROUP BY query
      ORDER BY search_count DESC
      LIMIT $1
    `;

    const result = await queryRead(query, [limit]);

    return result.rows.map(row => ({
      keyword: row.keyword,
      searchCount: parseInt(row.search_count),
      trendDirection: 'stable' as const, // TODO: Calculate trend
      lastSearchedAt: new Date(row.last_searched_at),
    }));
  }

  /**
   * Track search query for analytics
   */
  async trackSearch(query: SearchQuery, resultsCount: number, responseTime: number): Promise<void> {
    try {
      const client = await pool.connect();
      
      await client.query(
        `INSERT INTO search_logs (query, category, filters, results_count, user_session, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          query.keyword,
          query.categoryId ? String(query.categoryId) : null,
          JSON.stringify({ priceRange: query.priceRange, brand: query.brand, sortBy: query.sortBy }),
          resultsCount,
          'anonymous',
          'unknown',
        ]
      );
      
      client.release();
    } catch (error) {
      console.error('Failed to track search:', error);
      // Don't throw - tracking failure shouldn't break search
    }
  }

  // Private helper methods

  private async getFilterAggregations(
    keyword?: string,
    categoryId?: number,
    brand?: string
  ): Promise<SearchResponse['filters']> {
    // Build base WHERE clause for aggregations
    const conditions: string[] = ['p.is_active = true'];
    const params: any[] = [];
    let paramIndex = 1;

    if (keyword && keyword.trim()) {
      conditions.push(`(
        p.name_tsvector @@ plainto_tsquery('vietnamese', unaccent($${paramIndex}))
        OR p.keywords_tsvector @@ plainto_tsquery('vietnamese', unaccent($${paramIndex}))
        OR similarity(p.name, $${paramIndex}) > 0.3
      )`);
      params.push(keyword.trim());
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get category aggregations
    const categoryQuery = `
      SELECT
        c.id,
        c.name_vi AS name,
        COUNT(DISTINCT p.id) as count
      FROM products p
      INNER JOIN product_categories pc ON p.id = pc.product_id
      INNER JOIN categories c ON pc.category_id = c.id
      WHERE ${whereClause}
        ${categoryId ? `AND c.id != $${paramIndex}` : ''}
      GROUP BY c.id, c.name_vi
      ORDER BY count DESC
      LIMIT 10
    `;

    const categoryParams = categoryId ? [...params, categoryId] : params;
    const categoryResult = await queryRead(categoryQuery, categoryParams);

    // Get brand aggregations
    const brandQuery = `
      SELECT
        p.brand as name,
        COUNT(DISTINCT p.id) as count
      FROM products p
      WHERE ${whereClause}
        AND p.brand IS NOT NULL
        ${brand ? `AND p.brand != $${paramIndex}` : ''}
      GROUP BY p.brand
      ORDER BY count DESC
      LIMIT 10
    `;

    const brandParams = brand ? [...params, brand] : params;
    const brandResult = await queryRead(brandQuery, brandParams);

    // Get price range
    const priceQuery = `
      SELECT
        MIN(pe.price) as min_price,
        MAX(pe.price) as max_price
      FROM products p
      INNER JOIN price_entries pe ON p.id = pe.product_id
      WHERE ${whereClause}
        AND pe.is_available = true
    `;

    const priceResult = await queryRead(priceQuery, params);

    return {
      categories: categoryResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        count: parseInt(row.count),
      })),
      brands: brandResult.rows.map(row => ({
        name: row.name,
        count: parseInt(row.count),
      })),
      priceRange: {
        min: priceResult.rows[0]?.min_price || 0,
        max: priceResult.rows[0]?.max_price || 0,
      },
    };
  }
}

// Export singleton instance
export const searchService = new SearchService();
