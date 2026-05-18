/**
 * Unit tests for SEO Optimizer
 */

import { describe, it, expect } from '@jest/globals';
import { SEOOptimizer } from './SEOOptimizer';

describe('SEOOptimizer', () => {
  const optimizer = new SEOOptimizer();

  it('should generate SEO metadata with JSON-LD and OG tags', () => {
    const result = optimizer.optimize({
      title: 'Đánh giá iPhone 15 Pro Max',
      content: '# iPhone 15 Pro Max\n\n## Thiết kế\nSản phẩm cao cấp từ Apple với chip A17.',
      keyword: 'iphone 15 pro max',
      excerpt: 'Review chi tiết iPhone 15 Pro Max',
    });

    expect(result.seoMetadata.metaTitle).toContain('iPhone 15');
    expect(result.seoMetadata.metaDescription.length).toBeGreaterThan(10);
    expect(result.seoMetadata.keywords).toContain('iphone 15 pro max');
    expect(result.seoMetadata.structuredData?.['@type']).toBe('Article');
    expect(result.seoMetadata.ogTitle).toBeDefined();
  });

  it('should calculate keyword density', () => {
    const result = optimizer.optimize({
      title: 'Laptop gaming',
      content: 'laptop gaming laptop gaming là lựa chọn tốt cho game thủ',
      keyword: 'laptop gaming',
    });

    expect(result.keywordDensity).toBeGreaterThan(0);
  });
});
