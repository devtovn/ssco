/**
 * Content domain types
 */

export type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';

export interface Article {
  id: number;
  productId?: number;
  title: string;
  content: string;
  excerpt?: string;
  seoMetadata: SEOMetadata;
  status: ArticleStatus;
  authorId: number;
  reviewerId?: number;
  rejectionReason?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  viewCount: number;
}

export interface ArticleInput {
  productId?: number;
  title: string;
  content: string;
  excerpt?: string;
  seoMetadata?: Partial<SEOMetadata>;
}

export interface ArticleUpdate {
  title?: string;
  content?: string;
  excerpt?: string;
  seoMetadata?: Partial<SEOMetadata>;
  status?: ArticleStatus;
}

export interface SEOMetadata {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  structuredData?: Record<string, any>;
}

export interface ArticleGenerationRequest {
  productId?: number;
  keyword: string;
  targetLength?: number;
  tone?: 'professional' | 'casual' | 'technical';
  includeComparison?: boolean;
}

export interface GeneratedArticle {
  title: string;
  content: string;
  excerpt: string;
  seoMetadata: SEOMetadata;
  suggestedCategories: number[];
  readabilityScore: number;
}

export interface ArticleReview {
  articleId: number;
  reviewerId: number;
  action: 'approve' | 'reject' | 'request_changes';
  feedback?: string;
  reviewedAt: Date;
}
