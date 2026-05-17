/**
 * Analytics domain types
 */

import { DateRange } from './common';

export type InteractionType = 'page_view' | 'click' | 'search' | 'product_view' | 'price_comparison' | 'affiliate_click';

export interface UserInteraction {
  id: number;
  type: InteractionType;
  userId?: number;
  userSession: string;
  page: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface UserInteractionInput {
  type: InteractionType;
  userId?: number;
  userSession: string;
  page: string;
  metadata?: Record<string, any>;
}

export interface PopularProduct {
  productId: number;
  productName: string;
  categoryId?: number;
  categoryName?: string;
  viewCount: number;
  clickCount: number;
  conversionCount: number;
  conversionRate: number;
  revenue: number;
  period: DateRange;
}

export interface SearchTrend {
  keyword: string;
  searchCount: number;
  trendPercentage: number;
  trendDirection: 'up' | 'down' | 'stable';
  period: DateRange;
}

export interface SystemPerformance {
  timestamp: Date;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  activeUsers: number;
  requestsPerSecond: number;
  cacheHitRate: number;
  databaseConnections: {
    active: number;
    idle: number;
    waiting: number;
  };
}

export interface AnalyticsReport {
  id: number;
  reportType: 'daily' | 'weekly' | 'monthly';
  period: DateRange;
  data: {
    totalPageViews: number;
    totalSearches: number;
    totalProductViews: number;
    totalAffiliateClicks: number;
    totalRevenue: number;
    popularProducts: PopularProduct[];
    searchTrends: SearchTrend[];
    systemPerformance: SystemPerformance;
  };
  generatedAt: Date;
}

export interface AnalyticsQuery {
  dateRange: DateRange;
  metrics?: string[];
  groupBy?: 'day' | 'week' | 'month';
  filters?: Record<string, any>;
}

export interface AnalyticsSummary {
  period: DateRange;
  pageViews: number;
  uniqueVisitors: number;
  searches: number;
  productViews: number;
  affiliateClicks: number;
  conversionRate: number;
  averageSessionDuration: number;
  bounceRate: number;
}
