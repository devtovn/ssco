import { apiFetch } from './client';
import type { SEOMetadata } from '@kombe/types';

export interface PublishedArticle {
  id: string;
  productId?: string;
  title: string;
  content: string;
  excerpt?: string;
  seoMetadata: SEOMetadata;
  status: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export async function getPublishedArticles(limit = 20): Promise<PublishedArticle[]> {
  return apiFetch<PublishedArticle[]>('/public/articles', { params: { limit } });
}

export async function getPublishedArticle(id: string): Promise<PublishedArticle> {
  return apiFetch<PublishedArticle>(`/public/articles/${id}`);
}
