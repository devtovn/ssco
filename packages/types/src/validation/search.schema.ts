/**
 * Zod validation schemas for Search domain
 */

import { z } from 'zod';

export const SortBySchema = z.enum(['relevance', 'price_asc', 'price_desc', 'popularity', 'newest']);

export const PriceRangeSchema = z.object({
  min: z.number().positive(),
  max: z.number().positive(),
}).refine((data) => data.max >= data.min, {
  message: 'Max price must be greater than or equal to min price',
});

export const SearchQuerySchema = z.object({
  keyword: z.string().min(1, 'Search keyword is required').max(200, 'Search keyword is too long'),
  categoryId: z.number().int().positive().optional(),
  priceRange: PriceRangeSchema.optional(),
  brand: z.string().max(200).optional(),
  sortBy: SortBySchema.optional().default('relevance'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().min(1).max(100).default(20),
});

export const SearchResultSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().optional(),
  categoryId: z.number().int().positive(),
  categoryName: z.string(),
  brand: z.string().optional(),
  images: z.array(z.string().url()),
  priceRange: PriceRangeSchema,
  lowestPrice: z.number().positive().optional(),
  averagePrice: z.number().positive().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  isAvailable: z.boolean(),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  filters: z.object({
    categories: z.array(z.object({
      id: z.number().int().positive(),
      name: z.string(),
      count: z.number().int().nonnegative(),
    })),
    brands: z.array(z.object({
      name: z.string(),
      count: z.number().int().nonnegative(),
    })),
    priceRange: PriceRangeSchema,
  }),
  searchTime: z.number().nonnegative(),
});

export const PopularKeywordSchema = z.object({
  keyword: z.string(),
  searchCount: z.number().int().nonnegative(),
  trendDirection: z.enum(['up', 'down', 'stable']),
  trendPercentage: z.number().optional(),
  lastSearchedAt: z.date(),
});

export const SearchSuggestionSchema = z.object({
  text: z.string(),
  type: z.enum(['keyword', 'product', 'category', 'brand']),
  score: z.number().min(0).max(1),
  metadata: z.object({
    productId: z.number().int().positive().optional(),
    categoryId: z.number().int().positive().optional(),
    count: z.number().int().nonnegative().optional(),
  }).optional(),
});

export const SearchLogSchema = z.object({
  id: z.number().int().positive(),
  query: z.string(),
  categoryId: z.number().int().positive().optional(),
  filters: z.record(z.any()).optional(),
  resultsCount: z.number().int().nonnegative(),
  searchedAt: z.date(),
  userSession: z.string(),
  userAgent: z.string(),
  responseTime: z.number().nonnegative(),
});

// Type exports
export type SortBySchemaType = z.infer<typeof SortBySchema>;
export type PriceRangeSchemaType = z.infer<typeof PriceRangeSchema>;
export type SearchQuerySchemaType = z.infer<typeof SearchQuerySchema>;
export type SearchResultSchemaType = z.infer<typeof SearchResultSchema>;
export type SearchResponseSchemaType = z.infer<typeof SearchResponseSchema>;
export type PopularKeywordSchemaType = z.infer<typeof PopularKeywordSchema>;
export type SearchSuggestionSchemaType = z.infer<typeof SearchSuggestionSchema>;
export type SearchLogSchemaType = z.infer<typeof SearchLogSchema>;
