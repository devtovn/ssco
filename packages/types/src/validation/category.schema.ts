/**
 * Zod validation schemas for Category domain
 */

import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional(),
  icon: z.string().max(100).optional(),
  parentId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  productCount: z.number().int().nonnegative().optional(),
  level: z.number().int().nonnegative().optional(),
});

export const CategoryInputSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(200, 'Category name is too long'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(200, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000, 'Description is too long').optional(),
  icon: z.string().max(100, 'Icon name is too long').optional(),
  parentId: z.string().uuid().optional(),
});

export const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const CategoryTreeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    category: CategorySchema,
    children: z.array(CategoryTreeSchema),
  })
);

export const CategoryMetricsSchema = z.object({
  categoryId: z.number().int().positive(),
  productCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative(),
  searchCount: z.number().int().nonnegative(),
  conversionRate: z.number().min(0).max(100),
  popularProducts: z.array(z.number().int().positive()).optional(),
});

export const CategoryWithChildrenSchema = CategorySchema.extend({
  children: z.array(CategorySchema),
  subcategoryCount: z.number().int().nonnegative(),
});

// Type exports
export type CategorySchemaType = z.infer<typeof CategorySchema>;
export type CategoryInputSchemaType = z.infer<typeof CategoryInputSchema>;
export type CategoryUpdateSchemaType = z.infer<typeof CategoryUpdateSchema>;
export type CategoryMetricsSchemaType = z.infer<typeof CategoryMetricsSchema>;
export type CategoryWithChildrenSchemaType = z.infer<typeof CategoryWithChildrenSchema>;
