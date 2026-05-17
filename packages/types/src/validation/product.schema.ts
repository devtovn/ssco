/**
 * Zod validation schemas for Product domain
 */

import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  brand: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  specifications: z.record(z.any()).optional(),
  images: z.array(z.string().url()).default([]),
  keywords: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean().default(true),
  categories: z.array(z.number().int().positive()).optional(),
});

export const ProductInputSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(500, 'Product name is too long'),
  description: z.string().max(5000, 'Description is too long').optional(),
  brand: z.string().max(200, 'Brand name is too long').optional(),
  model: z.string().max(200, 'Model is too long').optional(),
  specifications: z.record(z.any()).optional(),
  images: z.array(z.string().url('Invalid image URL')).optional(),
  keywords: z.array(z.string().min(1).max(100)).optional(),
  categoryIds: z.array(z.number().int().positive()).min(1, 'At least one category is required').optional(),
});

export const ProductUpdateSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  brand: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  specifications: z.record(z.any()).optional(),
  images: z.array(z.string().url()).optional(),
  keywords: z.array(z.string().min(1).max(100)).optional(),
  isActive: z.boolean().optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const ProductPerformanceSchema = z.object({
  productId: z.number().int().positive(),
  productName: z.string(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(100),
  revenue: z.number().nonnegative(),
});

export const ProductWithPriceSchema = ProductSchema.extend({
  lowestPrice: z.number().positive().optional(),
  averagePrice: z.number().positive().optional(),
  priceRange: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).optional(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

// Type exports
export type ProductSchemaType = z.infer<typeof ProductSchema>;
export type ProductInputSchemaType = z.infer<typeof ProductInputSchema>;
export type ProductUpdateSchemaType = z.infer<typeof ProductUpdateSchema>;
export type ProductPerformanceSchemaType = z.infer<typeof ProductPerformanceSchema>;
export type ProductWithPriceSchemaType = z.infer<typeof ProductWithPriceSchema>;
