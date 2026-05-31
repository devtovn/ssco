/**
 * Unit tests for Content Management Service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { ContentManagementService } from './ContentManagementService';
import { AIService } from './AIService';
import { SEOOptimizer } from './SEOOptimizer';

describe('ContentManagementService', () => {
  let pool: jest.Mocked<Pool>;
  let ai: jest.Mocked<AIService>;
  let seo: SEOOptimizer;
  let service: ContentManagementService;

  const mockArticleRow = {
    id: '01ARYZ6S41ARTICLE00000000A',
    product_id: null,
    title: 'Review iPhone',
    content: '# iPhone\nContent here',
    seo_metadata: { metaTitle: 'Review', metaDescription: 'Desc', keywords: ['iphone'] },
    status: 'draft',
    created_by: '01ARYZ6S41USER0000000000U',
    reviewer_id: null,
    rejection_reason: null,
    version: 1,
    published_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    pool = { query: jest.fn(), connect: jest.fn() } as unknown as jest.Mocked<Pool>;
    ai = {
      isConfigured: jest.fn().mockReturnValue(true),
      generateArticleContent: jest.fn().mockResolvedValue({
        title: 'Review iPhone',
        content: '# iPhone\nContent here',
        excerpt: 'Short excerpt',
      }),
    } as unknown as jest.Mocked<AIService>;

    seo = new SEOOptimizer(pool);
    jest.spyOn(seo, 'validateUniqueness').mockResolvedValue({ isUnique: true, similarityScore: 0 });

    service = new ContentManagementService(pool, ai, seo);
  });

  describe('generateArticle', () => {
    it('should generate and store draft article', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [mockArticleRow] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient as never);

      const article = await service.generateArticle({
        keyword: 'iphone',
        createdBy: '01ARYZ6S41USER0000000000U',
      });

      expect(ai.generateArticleContent).toHaveBeenCalled();
      expect(article.title).toBe('Review iPhone');
      expect(article.status).toBe('draft');
    });
  });

  describe('submitForReview', () => {
    it('should transition draft to pending_review', async () => {
      pool.query.mockResolvedValue({
        rows: [{ ...mockArticleRow, status: 'pending_review' }],
      });

      const article = await service.submitForReview('01ARYZ6S41ARTICLE00000000A', '01ARYZ6S41USER0000000000U');
      expect(article.status).toBe('pending_review');
    });
  });

  describe('approveArticle', () => {
    it('should approve pending article', async () => {
      pool.query.mockResolvedValue({
        rows: [{ ...mockArticleRow, status: 'approved', reviewer_id: '01ARYZ6S41REVIEWER000000R' }],
      });

      const article = await service.approveArticle('01ARYZ6S41ARTICLE00000000A', '01ARYZ6S41REVIEWER000000R');
      expect(article.status).toBe('approved');
    });
  });

  describe('publishArticle', () => {
    it('should publish approved article', async () => {
      pool.query.mockResolvedValue({
        rows: [{ ...mockArticleRow, status: 'published', published_at: new Date() }],
      });

      const article = await service.publishArticle('01ARYZ6S41ARTICLE00000000A', '01ARYZ6S41REVIEWER000000R');
      expect(article.status).toBe('published');
    });
  });

  describe('getPendingArticles', () => {
    it('should return pending articles', async () => {
      pool.query.mockResolvedValue({
        rows: [{ ...mockArticleRow, status: 'pending_review' }],
      });

      const articles = await service.getPendingArticles();
      expect(articles).toHaveLength(1);
    });
  });
});
