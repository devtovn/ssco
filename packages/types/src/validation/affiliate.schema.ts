/**
 * Zod validation schemas for Affiliate domain
 */

import { z } from 'zod';

export const AffiliateProviderKindSchema = z.enum(['native', 'accesstrade', 'manual']);

export const AffiliateLinkFormatSchema = z.object({
  type: z.enum(['query_param', 'path_param', 'subdomain', 'custom']),
  parameterName: z.string().optional(),
  template: z.string().min(1).max(1000),
  exampleUrl: z.string().url(),
});

export const AffiliatePublisherSchema = z.object({
  id: z.string().length(26),
  provider: z.string().min(1).max(50),
  displayName: z.string().min(1).max(200),
  appToken: z.string().optional(),
  apiBaseUrl: z.string().url(),
  isEnabled: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AffiliatePublisherInputSchema = z.object({
  provider: z.string().min(1).max(50),
  displayName: z.string().min(1).max(200),
  appToken: z.string().optional(),
  apiBaseUrl: z.string().url().optional(),
  isEnabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const AffiliateConfigSchema = z.object({
  id: z.string().length(26),
  platformId: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/, 'Platform ID must contain only lowercase letters, numbers, underscores, and hyphens'),
  platformName: z.string().min(1).max(200),
  publisherId: z.string().length(26).optional(),
  provider: AffiliateProviderKindSchema.default('native'),
  domainPatterns: z.array(z.string().min(1)).default([]),
  referCode: z.string().min(1).max(500),
  linkTemplate: z.string().min(1).max(2000),
  linkFormat: AffiliateLinkFormatSchema,
  credentials: z.record(z.string()).optional(),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AffiliateConfigInputSchema = z.object({
  platformId: z.string()
    .min(1, 'Platform ID is required')
    .max(100, 'Platform ID is too long')
    .regex(/^[a-z0-9_-]+$/, 'Platform ID must contain only lowercase letters, numbers, underscores, and hyphens'),
  platformName: z.string().min(1, 'Platform name is required').max(200, 'Platform name is too long'),
  publisherId: z.string().length(26).optional(),
  provider: AffiliateProviderKindSchema.optional(),
  domainPatterns: z.array(z.string().min(1)).optional(),
  referCode: z.string().min(1, 'Refer code is required').max(500, 'Refer code is too long'),
  linkTemplate: z.string().min(1, 'Link template is required').max(2000, 'Link template is too long'),
  linkFormat: AffiliateLinkFormatSchema,
  credentials: z.record(z.string()).optional(),
  priority: z.number().int().min(0).optional(),
});

export const AffiliateConfigUpdateSchema = z.object({
  platformName: z.string().min(1).max(200).optional(),
  publisherId: z.string().length(26).nullable().optional(),
  provider: AffiliateProviderKindSchema.optional(),
  domainPatterns: z.array(z.string().min(1)).optional(),
  referCode: z.string().min(1).max(500).optional(),
  linkTemplate: z.string().min(1).max(2000).optional(),
  linkFormat: AffiliateLinkFormatSchema.optional(),
  credentials: z.record(z.string()).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const AffiliateCampaignSchema = z.object({
  id: z.string().length(26),
  affiliateConfigId: z.string().length(26),
  campaignId: z.string().min(1).max(100),
  campaignName: z.string().min(1).max(200),
  referCode: z.string().min(1).max(500),
  startDate: z.date(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine((data) => !data.endDate || data.endDate >= data.startDate, {
  message: 'End date must be after start date',
});

export const AffiliateCampaignInputSchema = z.object({
  affiliateConfigId: z.string().length(26),
  campaignId: z.string().min(1, 'Campaign ID is required').max(100),
  campaignName: z.string().min(1, 'Campaign name is required').max(200),
  referCode: z.string().min(1, 'Refer code is required').max(500),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
}).refine((data) => !data.endDate || data.endDate >= data.startDate, {
  message: 'End date must be after start date',
});

export const AffiliateLinkClickInputSchema = z.object({
  platformId: z.string().min(1).max(100),
  productId: z.string().length(26),
  generatedLink: z.string().url(),
  userSession: z.string().min(1).max(200),
  userAgent: z.string().min(1).max(500),
  referrer: z.string().url().optional(),
  campaignId: z.string().optional(),
});

export const AffiliatePerformanceSchema = z.object({
  platformId: z.string(),
  platformName: z.string(),
  totalClicks: z.number().int().nonnegative(),
  totalConversions: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(100),
  estimatedRevenue: z.number().nonnegative(),
  clicksByDate: z.array(z.object({
    date: z.date(),
    clicks: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
  })),
  topProducts: z.array(z.object({
    productId: z.string().length(26),
    productName: z.string().optional(),
    clicks: z.number().int().nonnegative(),
    conversions: z.number().int().nonnegative(),
    conversionRate: z.number().min(0).max(100),
    revenue: z.number().nonnegative(),
  })),
  period: z.object({
    startDate: z.date(),
    endDate: z.date(),
  }),
});

export const GeneratedAffiliateLinkSchema = z.object({
  originalUrl: z.string().url(),
  affiliateUrl: z.string().url(),
  platformId: z.string(),
  platformName: z.string(),
  affiliateCampaignId: z.string().length(26).optional(),
  expiresAt: z.date().optional(),
});

export type AffiliateProviderKindSchemaType = z.infer<typeof AffiliateProviderKindSchema>;
export type AffiliateLinkFormatSchemaType = z.infer<typeof AffiliateLinkFormatSchema>;
export type AffiliatePublisherSchemaType = z.infer<typeof AffiliatePublisherSchema>;
export type AffiliatePublisherInputSchemaType = z.infer<typeof AffiliatePublisherInputSchema>;
export type AffiliateConfigSchemaType = z.infer<typeof AffiliateConfigSchema>;
export type AffiliateConfigInputSchemaType = z.infer<typeof AffiliateConfigInputSchema>;
export type AffiliateConfigUpdateSchemaType = z.infer<typeof AffiliateConfigUpdateSchema>;
export type AffiliateCampaignSchemaType = z.infer<typeof AffiliateCampaignSchema>;
export type AffiliateCampaignInputSchemaType = z.infer<typeof AffiliateCampaignInputSchema>;
export type AffiliateLinkClickInputSchemaType = z.infer<typeof AffiliateLinkClickInputSchema>;
export type AffiliatePerformanceSchemaType = z.infer<typeof AffiliatePerformanceSchema>;
export type GeneratedAffiliateLinkSchemaType = z.infer<typeof GeneratedAffiliateLinkSchema>;
