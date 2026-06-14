/**
 * Affiliate domain types — aligned with PostgreSQL schema (ULID char(26))
 */

import { ProductPerformance } from './product';

/** How affiliate links are generated for a platform config */
export type AffiliateProviderKind = 'native' | 'accesstrade' | 'manual';

export type AffiliateLinkFormatType = 'query_param' | 'path_param' | 'subdomain' | 'custom';

export interface AffiliateLinkFormat {
  type: AffiliateLinkFormatType;
  parameterName?: string;
  template: string;
  exampleUrl: string;
}

/** Publisher-level credentials (e.g. AccessTrade app token shared across platforms) */
export interface AffiliatePublisher {
  id: string;
  provider: string;
  displayName: string;
  /** Omitted in API responses when masked */
  appToken?: string;
  apiBaseUrl: string;
  isEnabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliatePublisherInput {
  provider: string;
  displayName: string;
  appToken?: string;
  apiBaseUrl?: string;
  isEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AffiliatePublisherUpdate {
  displayName?: string;
  appToken?: string;
  apiBaseUrl?: string;
  isEnabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AffiliateConfig {
  id: string;
  platformId: string;
  platformName: string;
  publisherId?: string;
  provider: AffiliateProviderKind;
  domainPatterns: string[];
  referCode: string;
  linkTemplate: string;
  linkFormat: AffiliateLinkFormat;
  /**
   * Platform-specific credentials when provider = native.
   * tiki: { refCode }, shopee: { pubId, accessToken }, etc.
   */
  credentials?: Record<string, string>;
  isEnabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateConfigInput {
  platformId: string;
  platformName: string;
  publisherId?: string;
  provider?: AffiliateProviderKind;
  domainPatterns?: string[];
  referCode: string;
  linkTemplate: string;
  linkFormat: AffiliateLinkFormat;
  credentials?: Record<string, string>;
  priority?: number;
}

export interface AffiliateConfigUpdate {
  platformName?: string;
  publisherId?: string | null;
  provider?: AffiliateProviderKind;
  domainPatterns?: string[];
  referCode?: string;
  linkTemplate?: string;
  linkFormat?: AffiliateLinkFormat;
  credentials?: Record<string, string>;
  isEnabled?: boolean;
  priority?: number;
}

export interface AffiliateCampaign {
  id: string;
  affiliateConfigId: string;
  /** External campaign ID (e.g. AccessTrade campaign_id) */
  campaignId: string;
  campaignName: string;
  referCode: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  /** Default campaign for seed / bulk regenerate */
  isPrimary: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateCampaignInput {
  affiliateConfigId: string;
  campaignId: string;
  campaignName: string;
  referCode: string;
  startDate: Date;
  endDate?: Date;
  isActive?: boolean;
  isPrimary?: boolean;
  notes?: string;
}

export interface AffiliateCampaignUpdate {
  campaignName?: string;
  referCode?: string;
  startDate?: Date;
  endDate?: Date | null;
  isActive?: boolean;
  isPrimary?: boolean;
  notes?: string;
}

export interface AffiliateLinkClick {
  id: string;
  affiliateConfigId: string;
  productId?: string;
  campaignId?: string;
  generatedLink: string;
  userSession?: string;
  userAgent?: string;
  referrer?: string;
  clickedAt: Date;
  isConversion: boolean;
  conversionValue?: number;
  conversionAt?: Date;
}

export interface AffiliateLinkClickInput {
  platformId: string;
  productId: string;
  generatedLink: string;
  userSession: string;
  userAgent: string;
  referrer?: string;
  campaignId?: string;
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
  /** Internal ULID of affiliate_campaigns row used */
  affiliateCampaignId?: string;
  expiresAt?: Date;
}
