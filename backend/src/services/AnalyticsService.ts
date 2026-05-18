/**
 * Analytics Service
 * Tracks public usage, search trends, popular products, and system performance
 */

import { Pool } from 'pg';
import { pool, getPoolStats } from '../config/database';

export type InteractionEventType = 'page_view' | 'click' | 'product_view' | 'search';

export interface UserInteractionInput {
  eventType: InteractionEventType;
  pagePath?: string;
  productId?: string;
  targetUrl?: string;
  metadata?: Record<string, unknown>;
  userSession?: string;
  userAgent?: string;
  referrer?: string;
}

export interface SearchQueryTrackInput {
  query: string;
  category?: string;
  filters?: Record<string, unknown>;
  resultsCount: number;
  userSession?: string;
  userAgent?: string;
}

export interface PopularProduct {
  productId: string;
  productName: string;
  viewCount: number;
  clickCount: number;
}

export interface SearchTrend {
  query: string;
  searchCount: number;
  avgResults: number;
  lastSearched: Date;
}

export interface SystemPerformanceMetrics {
  uptimeSeconds: number;
  databasePool: ReturnType<typeof getPoolStats>;
  recentMetrics: Array<{
    name: string;
    value: number;
    unit: string | null;
    recordedAt: Date;
  }>;
  errorRate: number;
  avgResponseTimeMs: number;
}

export interface AnalyticsReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  popularProducts: PopularProduct[];
  searchTrends: SearchTrend[];
  systemPerformance: SystemPerformanceMetrics;
  summary: {
    totalPageViews: number;
    totalSearches: number;
    uniqueSessions: number;
  };
}

export class AnalyticsService {
  private startTime = Date.now();

  constructor(private db: Pool = pool) {}

  async trackUserInteraction(input: UserInteractionInput): Promise<void> {
    await this.db.query(
      `INSERT INTO user_interactions
        (event_type, page_path, product_id, target_url, metadata, user_session, user_agent, referrer)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.eventType,
        input.pagePath || null,
        input.productId || null,
        input.targetUrl || null,
        JSON.stringify(input.metadata || {}),
        input.userSession || null,
        input.userAgent || null,
        input.referrer || null,
      ]
    );

    if (input.productId && input.eventType === 'product_view') {
      await this.incrementDailyAggregate('product_view', input.productId);
    }

    if (input.eventType === 'page_view' && input.pagePath) {
      await this.incrementDailyAggregate('page_view', input.pagePath);
    }
  }

  async trackSearchQuery(input: SearchQueryTrackInput): Promise<void> {
    await this.db.query(
      `INSERT INTO search_logs (query, category, filters, results_count, user_session, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.query,
        input.category || null,
        JSON.stringify(input.filters || {}),
        input.resultsCount,
        input.userSession || null,
        input.userAgent || null,
      ]
    );

    await this.incrementDailyAggregate('search', input.query.toLowerCase().trim());
  }

  async getPopularProducts(
    days: number = 7,
    limit: number = 20
  ): Promise<PopularProduct[]> {
    const result = await this.db.query(
      `SELECT
        p.id AS product_id,
        p.name AS product_name,
        COUNT(*) FILTER (WHERE ui.event_type = 'product_view') AS view_count,
        COUNT(*) FILTER (WHERE ui.event_type = 'click') AS click_count
       FROM user_interactions ui
       INNER JOIN products p ON p.id = ui.product_id
       WHERE ui.product_id IS NOT NULL
         AND ui.created_at >= NOW() - ($1 || ' days')::interval
       GROUP BY p.id, p.name
       ORDER BY view_count DESC, click_count DESC
       LIMIT $2`,
      [days, limit]
    );

    return result.rows.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      viewCount: parseInt(row.view_count, 10),
      clickCount: parseInt(row.click_count, 10),
    }));
  }

  async getSearchTrends(days: number = 7, limit: number = 20): Promise<SearchTrend[]> {
    const result = await this.db.query(
      `SELECT
        query,
        COUNT(*) AS search_count,
        AVG(results_count)::numeric(10,2) AS avg_results,
        MAX(searched_at) AS last_searched
       FROM search_logs
       WHERE searched_at >= NOW() - ($1 || ' days')::interval
       GROUP BY query
       ORDER BY search_count DESC
       LIMIT $2`,
      [days, limit]
    );

    return result.rows.map((row) => ({
      query: row.query,
      searchCount: parseInt(row.search_count, 10),
      avgResults: parseFloat(row.avg_results),
      lastSearched: new Date(row.last_searched),
    }));
  }

  async getSystemPerformance(): Promise<SystemPerformanceMetrics> {
    const metricsResult = await this.db.query(
      `SELECT metric_name, metric_value, unit, recorded_at
       FROM system_metrics
       WHERE recorded_at >= NOW() - INTERVAL '24 hours'
       ORDER BY recorded_at DESC
       LIMIT 100`
    );

    const errorResult = await this.db.query(
      `SELECT
        COUNT(*) FILTER (WHERE metric_name = 'api_error') AS errors,
        COUNT(*) FILTER (WHERE metric_name = 'api_request') AS requests,
        AVG(metric_value) FILTER (WHERE metric_name = 'response_time_ms') AS avg_response
       FROM system_metrics
       WHERE recorded_at >= NOW() - INTERVAL '1 hour'`
    );

    const row = errorResult.rows[0] || {};
    const errors = parseInt(row.errors || '0', 10);
    const requests = parseInt(row.requests || '0', 10);

    return {
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      databasePool: getPoolStats(),
      recentMetrics: metricsResult.rows.map((m) => ({
        name: m.metric_name,
        value: parseFloat(m.metric_value),
        unit: m.unit,
        recordedAt: new Date(m.recorded_at),
      })),
      errorRate: requests > 0 ? errors / requests : 0,
      avgResponseTimeMs: parseFloat(row.avg_response || '0'),
    };
  }

  async recordSystemMetric(
    name: string,
    value: number,
    unit?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO system_metrics (metric_name, metric_value, unit, metadata)
       VALUES ($1, $2, $3, $4)`,
      [name, value, unit || null, JSON.stringify(metadata || {})]
    );
  }

  async generateReport(days: number = 7): Promise<AnalyticsReport> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const [popularProducts, searchTrends, systemPerformance, summaryResult] =
      await Promise.all([
        this.getPopularProducts(days),
        this.getSearchTrends(days),
        this.getSystemPerformance(),
        this.db.query(
          `SELECT
            COUNT(*) FILTER (WHERE ui.event_type = 'page_view') AS page_views,
            (SELECT COUNT(*) FROM search_logs WHERE searched_at >= NOW() - ($1 || ' days')::interval) AS searches,
            COUNT(DISTINCT ui.user_session) AS unique_sessions
           FROM user_interactions ui
           WHERE ui.created_at >= NOW() - ($1 || ' days')::interval`,
          [days]
        ),
      ]);

    const summaryRow = summaryResult.rows[0] || {};

    return {
      generatedAt: new Date(),
      period: { start, end },
      popularProducts,
      searchTrends,
      systemPerformance,
      summary: {
        totalPageViews: parseInt(summaryRow.page_views || '0', 10),
        totalSearches: parseInt(summaryRow.searches || '0', 10),
        uniqueSessions: parseInt(summaryRow.unique_sessions || '0', 10),
      },
    };
  }

  /**
   * Apply 12-month retention policy
   */
  async applyRetentionPolicy(monthsToKeep: number = 12): Promise<void> {
    await this.db.query('SELECT purge_analytics_older_than_months($1)', [monthsToKeep]);
  }

  private async incrementDailyAggregate(
    metricType: string,
    dimensionKey: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO analytics_daily_aggregates (aggregate_date, metric_type, dimension_key, metric_value)
       VALUES (CURRENT_DATE, $1, $2, 1)
       ON CONFLICT (aggregate_date, metric_type, dimension_key)
       DO UPDATE SET metric_value = analytics_daily_aggregates.metric_value + 1`,
      [metricType, dimensionKey]
    );
  }
}

export const analyticsService = new AnalyticsService();
