/**
 * Affiliate domain types
 */

import { ProductPerformance } from './product';

export type AffiliateLinkFormat = 'query_param' | 'path_param' | 'subdomain' | 'custom';

export interface AffiliateConfig {
  id: number;
  platformId: string;
  platformName: string;
  referCode: string;
  linkTemplate: string;
  linkFormat: AffiliateLinkFormat;
  isActive: boolean;
  priority: number;
  commissionRate?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateConfigInput {
  platformId: string;
  platformName: string;
  referCode: string;
  linkTemplate: string;
  linkFormat: AffiliateLinkFormat;
  priority?: number;
  commissionRate?: number;
  notes?: string;
}

export interface AffiliateConfigUpdate {
  platformName?: string;
  referCode?: string;
  linkTemplate?: string;
  linkFormat?: AffiliateLinkFormat;
  isActive?: boolean;
  priority?: number;
  commissionRate?: number;
  notes?: string;
}

export interface AffiliateCampaign {
  id: number;
  platformId: string;
  campaignName: string;
  campaignCode: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  targetRevenue?: number;
  actualRevenue?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateCampaignInput {
  platformId: string;
  campaignName: string;
  campaignCode: string;
  startDate: Date;
  endDate?: Date;
  targetRevenue?: number;
}

export interface AffiliateLinkClick {
  id: number;
  platformId: string;
  productId: number;
  campaignId?: number;
  userSession: string;
  userAgent: string;
  referrer?: string;
  ipAddress?: string;
  clickedAt: Date;
  converted: boolean;
  conversionValue?: number;
}

export interface AffiliateLinkClickInput {
  platformId: string;
  productId: number;
  campaignId?: number;
  userSession: string;
  userAgent: string;
  referrer?: string;
  ipAddress?: string;
}

export interface AffiliatePerformance {
  platformId: string;
  platformName: string;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  estimatedRevenue: number;
  clicksByDate: Array<{
    date: Date;
    clicks: number;
    conversions: number;
  }>;
  topProducts: ProductPerformance[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface GeneratedAffiliateLink {
  originalUrl: string;
  affiliateUrl: string;
  platformId: string;
  platformName: string;
  campaignId?: number;
  expiresAt?: Date;
}
