/**
 * Zod validation schemas for Affiliate domain
 */

import { z } from 'zod';

export const AffiliateLinkFormatSchema = z.enum(['query_param', 'path_param', 'subdomain', 'custom']);

export const AffiliateConfigSchema = z.object({
  id: z.number().int().positive(),
  platformId: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, 'Platform ID must contain only lowercase letters, numbers, underscores, and hyphens'),
  platformName: z.string().min(1).max(200),
  referCode: z.string().min(1).max(200),
  linkTemplate: z.string().min(1).max(1000),
  linkFormat: AffiliateLinkFormatSchema,
  isActive: z.boolean().default(true),
  priority: z.number().int().positive().default(1),
  commissionRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AffiliateConfigInputSchema = z.object({
  platformId: z.string()
    .min(1, 'Platform ID is required')
    .max(50, 'Platform ID is too long')
    .regex(/^[a-z0-9_-]+$/, 'Platform ID must contain only lowercase letters, numbers, underscores, and hyphens'),
  platformName: z.string().min(1, 'Platform name is required').max(200, 'Platform name is too long'),
  referCode: z.string().min(1, 'Refer code is required').max(200, 'Refer code is too long'),
  linkTemplate: z.string()
    .min(1, 'Link template is required')
    .max(1000, 'Link template is too long')
    .refine((val) => val.includes('{{'), { message: 'Link template must contain placeholders like {{product_url}} or {{refer_code}}' }),
  linkFormat: AffiliateLinkFormatSchema,
  priority: z.number().int().positive().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const AffiliateConfigUpdateSchema = z.object({
  platformName: z.string().min(1).max(200).optional(),
  referCode: z.string().min(1).max(200).optional(),
  linkTemplate: z.string().min(1).max(1000).optional(),
  linkFormat: AffiliateLinkFormatSchema.optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().positive().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const AffiliateCampaignSchema = z.object({
  id: z.number().int().positive(),
  platformId: z.string().min(1).max(50),
  campaignName: z.string().min(1).max(200),
  campaignCode: z.string().min(1).max(200),
  startDate: z.date(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
  targetRevenue: z.number().positive().optional(),
  actualRevenue: z.number().nonnegative().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine((data) => !data.endDate || data.endDate >= data.startDate, {
  message: 'End date must be after start date',
});

export const AffiliateCampaignInputSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required').max(50),
  campaignName: z.string().min(1, 'Campaign name is required').max(200),
  campaignCode: z.string().min(1, 'Campaign code is required').max(200),
  startDate: z.date(),
  endDate: z.date().optional(),
  targetRevenue: z.number().positive().optional(),
}).refine((data) => !data.endDate || data.endDate >= data.startDate, {
  message: 'End date must be after start date',
});

export const AffiliateLinkClickInputSchema = z.object({
  platformId: z.string().min(1).max(50),
  productId: z.number().int().positive(),
  campaignId: z.number().int().positive().optional(),
  userSession: z.string().min(1).max(200),
  userAgent: z.string().min(1).max(500),
  referrer: z.string().url().optional(),
  ipAddress: z.string().ip().optional(),
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
    productId: z.number().int().positive(),
    productName: z.string(),
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
  campaignId: z.number().int().positive().optional(),
  expiresAt: z.date().optional(),
});

// Type exports
export type AffiliateLinkFormatSchemaType = z.infer<typeof AffiliateLinkFormatSchema>;
export type AffiliateConfigSchemaType = z.infer<typeof AffiliateConfigSchema>;
export type AffiliateConfigInputSchemaType = z.infer<typeof AffiliateConfigInputSchema>;
export type AffiliateConfigUpdateSchemaType = z.infer<typeof AffiliateConfigUpdateSchema>;
export type AffiliateCampaignSchemaType = z.infer<typeof AffiliateCampaignSchema>;
export type AffiliateCampaignInputSchemaType = z.infer<typeof AffiliateCampaignInputSchema>;
export type AffiliateLinkClickInputSchemaType = z.infer<typeof AffiliateLinkClickInputSchema>;
export type AffiliatePerformanceSchemaType = z.infer<typeof AffiliatePerformanceSchema>;
export type GeneratedAffiliateLinkSchemaType = z.infer<typeof GeneratedAffiliateLinkSchema>;
