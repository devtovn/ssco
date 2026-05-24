import { apiFetch } from './client';
import type { CategoryTree } from '@price-comparison/types';

export interface Deal {
  productId: string | number;
  slug?: string;
  productName: string;
  productImage?: string;
  categoryId?: string | number;
  categoryName?: string;
  originalPrice: number;
  currentPrice: number;
  discount: number;
  discountPercentage: number;
  source: string;
  sourceUrl?: string;
}

export async function getCategoryTree(): Promise<CategoryTree[]> {
  return apiFetch<CategoryTree[]>('/categories/tree');
}

export async function getBestDeals(limit = 8): Promise<Deal[]> {
  return apiFetch<Deal[]>('/deals', { params: { limit, minDiscount: 5 } });
}
