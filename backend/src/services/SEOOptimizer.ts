/**
 * SEO Optimizer
 * Meta tags, JSON-LD, Open Graph, and content uniqueness checks
 */

import { Pool } from 'pg';
import { SEOMetadata } from '@kombe/types';

export interface SEOOptimizationInput {
  title: string;
  content: string;
  keyword: string;
  excerpt?: string;
  canonicalUrl?: string;
  ogImage?: string;
}

export interface SEOOptimizationResult {
  seoMetadata: SEOMetadata;
  keywordDensity: number;
  isUnique: boolean;
  uniquenessScore: number;
}

export class SEOOptimizer {
  constructor(private pool?: Pool) {}

  optimize(input: SEOOptimizationInput): SEOOptimizationResult {
    const metaTitle = this.truncate(`${input.title} | So sánh giá`, 60);
    const metaDescription = this.truncate(
      input.excerpt || this.extractExcerpt(input.content),
      160
    );
    const keywords = this.extractKeywords(input.keyword, input.content);

    const seoMetadata: SEOMetadata = {
      metaTitle,
      metaDescription,
      keywords,
      canonicalUrl: input.canonicalUrl,
      ogTitle: metaTitle,
      ogDescription: metaDescription,
      ogImage: input.ogImage,
      structuredData: this.buildArticleJsonLd(input),
    };

    const keywordDensity = this.calculateKeywordDensity(input.content, input.keyword);

    return {
      seoMetadata,
      keywordDensity,
      isUnique: true,
      uniquenessScore: 1,
    };
  }

  async validateUniqueness(
    title: string,
    content: string,
    excludeArticleId?: string
  ): Promise<{ isUnique: boolean; similarityScore: number; similarArticleId?: string }> {
    if (!this.pool) {
      return { isUnique: true, similarityScore: 0 };
    }

    const params: string[] = [title.toLowerCase()];
    let excludeClause = '';

    if (excludeArticleId) {
      params.push(excludeArticleId);
      excludeClause = 'AND id != $2';
    }

    const result = await this.pool.query(
      `SELECT id, title, content
       FROM articles
       WHERE LOWER(title) = $1 ${excludeClause}
       LIMIT 1`,
      params
    );

    if (result.rows.length > 0) {
      return {
        isUnique: false,
        similarityScore: 1,
        similarArticleId: result.rows[0].id,
      };
    }

    try {
      const contentSample = content.slice(0, 500).toLowerCase();
      const similarityResult = await this.pool.query(
        `SELECT id, title,
          similarity(LEFT(LOWER(content), 500), $1) AS score
         FROM articles
         WHERE status IN ('published', 'approved', 'pending_review')
         ${excludeArticleId ? 'AND id != $2' : ''}
         ORDER BY score DESC
         LIMIT 1`,
        excludeArticleId ? [contentSample, excludeArticleId] : [contentSample]
      );

      if (similarityResult.rows.length > 0) {
        const score = parseFloat(similarityResult.rows[0].score || '0');
        if (score > 0.6) {
          return {
            isUnique: false,
            similarityScore: score,
            similarArticleId: similarityResult.rows[0].id,
          };
        }
      }
    } catch (err) {
      console.error('[SEOOptimizer] similarity check failed (pg_trgm may be unavailable)', err);
    }

    return { isUnique: true, similarityScore: 0 };
  }

  private buildArticleJsonLd(input: SEOOptimizationInput): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: input.title,
      description: input.excerpt || this.extractExcerpt(input.content),
      inLanguage: 'vi-VN',
      keywords: input.keyword,
      author: {
        '@type': 'Organization',
        name: 'SSCO Price Comparison',
      },
    };
  }

  private extractKeywords(primaryKeyword: string, content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^a-zà-ỹ0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 4);

    const frequency = new Map<string, number>();
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    const topWords = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return [primaryKeyword.toLowerCase(), ...topWords].filter(
      (v, i, arr) => arr.indexOf(v) === i
    );
  }

  private calculateKeywordDensity(content: string, keyword: string): number {
    const words = content.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 0;

    const keywordTokens = keyword.toLowerCase().split(/\s+/);
    let matches = 0;

    for (let i = 0; i <= words.length - keywordTokens.length; i++) {
      const slice = words.slice(i, i + keywordTokens.length).join(' ');
      if (slice === keywordTokens.join(' ')) matches++;
    }

    return matches / words.length;
  }

  private extractExcerpt(content: string): string {
    const plain = content.replace(/[#*_`>\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.slice(0, 155) + (plain.length > 155 ? '...' : '');
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
}

export const seoOptimizer = new SEOOptimizer();
