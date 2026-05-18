/**
 * Content Management Service
 * AI article generation, review workflow, SEO optimization, and version control
 */

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { AIService, aiService, AIGenerationOptions } from './AIService';
import { SEOOptimizer, seoOptimizer, SEOOptimizationResult } from './SEOOptimizer';
import { SEOMetadata } from '@price-comparison/types';

export type ArticleStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'rejected';

export interface ArticleRecord {
  id: string;
  productId?: string;
  title: string;
  content: string;
  excerpt?: string;
  seoMetadata: SEOMetadata;
  status: ArticleStatus;
  createdBy?: string;
  reviewerId?: string;
  rejectionReason?: string;
  version: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateArticleInput {
  keyword: string;
  productId?: string;
  createdBy: string;
  options?: Partial<AIGenerationOptions>;
}

export interface EditArticleInput {
  title?: string;
  content?: string;
  excerpt?: string;
  seoMetadata?: Partial<SEOMetadata>;
  editedBy: string;
}

export class ContentManagementService {
  constructor(
    private db: Pool = pool,
    private ai: AIService = aiService,
    private seo: SEOOptimizer = seoOptimizer
  ) {
    this.seo = new SEOOptimizer(db);
  }

  async generateArticle(input: GenerateArticleInput): Promise<ArticleRecord> {
    if (!this.ai.isConfigured()) {
      throw new Error(
        'AI service is not configured. Set OPENAI_API_KEY or CLAUDE_API_KEY in environment.'
      );
    }

    const generated = await this.ai.generateArticleContent({
      keyword: input.keyword,
      ...input.options,
    });

    const seoResult = this.optimizeForSEO({
      title: generated.title,
      content: generated.content,
      keyword: input.keyword,
      excerpt: generated.excerpt,
    });

    const uniqueness = await this.seo.validateUniqueness(
      generated.title,
      generated.content
    );

    if (!uniqueness.isUnique) {
      throw new Error(
        `Generated content is too similar to existing article ${uniqueness.similarArticleId}`
      );
    }

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const insertResult = await client.query(
        `INSERT INTO articles
          (product_id, title, content, seo_metadata, status, created_by, version)
         VALUES ($1, $2, $3, $4, 'draft', $5, 1)
         RETURNING *`,
        [
          input.productId || null,
          generated.title,
          generated.content,
          JSON.stringify({
            ...seoResult.seoMetadata,
            excerpt: generated.excerpt,
            keyword: input.keyword,
          }),
          input.createdBy,
        ]
      );

      await client.query('COMMIT');
      return this.mapRow(insertResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async editArticle(articleId: string, input: EditArticleInput): Promise<ArticleRecord> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT * FROM articles WHERE id = $1', [
        articleId,
      ]);

      if (existing.rows.length === 0) {
        throw new Error(`Article ${articleId} not found`);
      }

      const current = existing.rows[0];
      const editableStatuses: ArticleStatus[] = ['draft', 'pending_review', 'rejected'];

      if (!editableStatuses.includes(current.status)) {
        throw new Error(`Cannot edit article in status: ${current.status}`);
      }

      await this.saveVersion(client, current, input.editedBy);

      const title = input.title ?? current.title;
      const content = input.content ?? current.content;
      const seoMetadata = {
        ...(typeof current.seo_metadata === 'object' ? current.seo_metadata : {}),
        ...input.seoMetadata,
        ...(input.excerpt ? { excerpt: input.excerpt } : {}),
      };

      const updateResult = await client.query(
        `UPDATE articles SET
          title = $1,
          content = $2,
          seo_metadata = $3,
          version = version + 1,
          updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [title, content, JSON.stringify(seoMetadata), articleId]
      );

      await client.query('COMMIT');
      return this.mapRow(updateResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async submitForReview(articleId: string, userId: string): Promise<ArticleRecord> {
    return this.updateStatus(articleId, 'pending_review', userId, ['draft', 'rejected']);
  }

  async approveArticle(articleId: string, reviewerId: string): Promise<ArticleRecord> {
    return this.updateStatus(articleId, 'approved', reviewerId, ['pending_review'], reviewerId);
  }

  async rejectArticle(
    articleId: string,
    reviewerId: string,
    reason: string
  ): Promise<ArticleRecord> {
    const result = await this.db.query(
      `UPDATE articles SET
        status = 'rejected',
        reviewer_id = $1,
        rejection_reason = $2,
        updated_at = NOW()
       WHERE id = $3 AND status = 'pending_review'
       RETURNING *`,
      [reviewerId, reason, articleId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Article ${articleId} not found or not pending review`);
    }

    return this.mapRow(result.rows[0]);
  }

  async publishArticle(articleId: string, publisherId: string): Promise<ArticleRecord> {
    const result = await this.db.query(
      `UPDATE articles SET
        status = 'published',
        reviewer_id = COALESCE(reviewer_id, $1),
        published_at = NOW(),
        updated_at = NOW()
       WHERE id = $2 AND status IN ('approved', 'pending_review')
       RETURNING *`,
      [publisherId, articleId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Article ${articleId} not found or not ready for publishing`);
    }

    return this.mapRow(result.rows[0]);
  }

  async getPendingArticles(): Promise<ArticleRecord[]> {
    const result = await this.db.query(
      `SELECT * FROM articles
       WHERE status = 'pending_review'
       ORDER BY updated_at ASC`
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async getArticleById(articleId: string): Promise<ArticleRecord | null> {
    const result = await this.db.query('SELECT * FROM articles WHERE id = $1', [articleId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getPublishedArticles(limit: number = 20): Promise<ArticleRecord[]> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const result = await this.db.query(
      `SELECT * FROM articles
       WHERE status = 'published'
       ORDER BY published_at DESC NULLS LAST, updated_at DESC
       LIMIT $1`,
      [safeLimit]
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  async getPublishedArticleById(id: string): Promise<ArticleRecord | null> {
    const result = await this.db.query(
      `SELECT * FROM articles WHERE id = $1 AND status = 'published'`,
      [id]
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  async getArticleVersions(articleId: string): Promise<
    Array<{
      version: number;
      title: string;
      editedBy?: string;
      createdAt: Date;
    }>
  > {
    const result = await this.db.query(
      `SELECT version, title, edited_by, created_at
       FROM article_versions
       WHERE article_id = $1
       ORDER BY version DESC`,
      [articleId]
    );

    return result.rows.map((row) => ({
      version: row.version,
      title: row.title,
      editedBy: row.edited_by,
      createdAt: new Date(row.created_at),
    }));
  }

  optimizeForSEO(input: {
    title: string;
    content: string;
    keyword: string;
    excerpt?: string;
    canonicalUrl?: string;
    ogImage?: string;
  }): SEOOptimizationResult {
    return this.seo.optimize(input);
  }

  private async updateStatus(
    articleId: string,
    status: ArticleStatus,
    userId: string,
    allowedFrom: ArticleStatus[],
    reviewerId?: string
  ): Promise<ArticleRecord> {
    const result = await this.db.query(
      `UPDATE articles SET
        status = $1,
        reviewer_id = COALESCE($2, reviewer_id),
        updated_at = NOW()
       WHERE id = $3 AND status = ANY($4::varchar[])
       RETURNING *`,
      [status, reviewerId || null, articleId, allowedFrom]
    );

    if (result.rows.length === 0) {
      throw new Error(
        `Cannot transition article ${articleId} to ${status} from allowed states: ${allowedFrom.join(', ')}`
      );
    }

    return this.mapRow(result.rows[0]);
  }

  private async saveVersion(
    client: PoolClient,
    article: Record<string, unknown>,
    editedBy: string
  ): Promise<void> {
    await client.query(
      `INSERT INTO article_versions (article_id, version, title, content, seo_metadata, edited_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        article.id,
        article.version,
        article.title,
        article.content,
        JSON.stringify(article.seo_metadata || {}),
        editedBy,
      ]
    );
  }

  private mapRow(row: Record<string, unknown>): ArticleRecord {
    const seo =
      typeof row.seo_metadata === 'string'
        ? JSON.parse(row.seo_metadata)
        : row.seo_metadata || {};

    return {
      id: row.id as string,
      productId: (row.product_id as string) || undefined,
      title: row.title as string,
      content: row.content as string,
      excerpt: seo.excerpt as string | undefined,
      seoMetadata: seo as SEOMetadata,
      status: row.status as ArticleStatus,
      createdBy: (row.created_by as string) || undefined,
      reviewerId: (row.reviewer_id as string) || undefined,
      rejectionReason: (row.rejection_reason as string) || undefined,
      version: row.version as number,
      publishedAt: row.published_at ? new Date(row.published_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

export const contentManagementService = new ContentManagementService();
