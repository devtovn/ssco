import { apiFetch } from './client';
import type {
  PopularKeyword,
  SearchResponse,
  SearchSuggestion,
  SortBy,
} from '@price-comparison/types';

export interface SearchProductsParams {
  keyword: string;
  page?: number;
  limit?: number;
  categoryId?: number | string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sortBy?: SortBy;
}

export async function getSearchSuggestions(q: string, limit = 8): Promise<SearchSuggestion[]> {
  if (q.length < 2) return [];
  return apiFetch<SearchSuggestion[]>('/search/suggestions', { params: { q, limit } });
}

export async function getPopularKeywords(limit = 10): Promise<PopularKeyword[]> {
  return apiFetch<PopularKeyword[]>('/search/popular-keywords', { params: { limit } });
}

export async function searchProducts(params: SearchProductsParams): Promise<SearchResponse> {
  return apiFetch<SearchResponse>('/search', {
    params: {
      keyword: params.keyword,
      page: params.page || 1,
      limit: params.limit || 20,
      categoryId: params.categoryId,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      brand: params.brand,
      sortBy: params.sortBy,
    },
  });
}

export async function trackSearch(query: string, resultsCount: number): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  await fetch(`${base}/api/analytics/track-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, resultsCount }),
  }).catch(() => undefined);
}
