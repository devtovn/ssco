import { apiFetch, buildApiUrl, ApiError } from './client';
import type { Category } from '@kombe/types';

export interface CategoryProduct {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  brand?: string;
  images?: string[] | string;
  lowest_price?: number;
  created_at?: string;
}

export interface CategoryProductsResponse {
  products: CategoryProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  return apiFetch<Category>(`/categories/slug/${slug}`);
}

export async function getCategoryProducts(
  categoryId: number | string,
  params?: { page?: number; limit?: number; includeSubcategories?: boolean }
): Promise<CategoryProductsResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const url = buildApiUrl(`/categories/${categoryId}/products`, {
    page,
    limit,
    includeSubcategories: params?.includeSubcategories !== false ? 'true' : 'false',
  });

  const response = await fetch(url, { next: { revalidate: 60 } });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      json?.error?.message || json?.error || 'Request failed',
      response.status,
      json?.error?.code
    );
  }

  const products = (json.data ?? []) as CategoryProduct[];
  const pagination = json.pagination ?? {
    page,
    limit,
    total: products.length,
    totalPages: 1,
  };

  return { products, pagination };
}
