/**
 * Public API Routes
 * Unauthenticated endpoints for published content
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ContentManagementService } from '../services/ContentManagementService';
import { AdminService } from '../services/AdminService';
import { Pool } from 'pg';

const router = Router();

// Public site config — returns only branding fields, no auth required
router.get(
  '/config',
  asyncHandler(async (req: Request, res: Response) => {
    const adminService = req.app.get('adminService') as AdminService;
    try {
      const config = await adminService.getWebsiteConfig();
      res.json({
        siteName: config.siteName ?? null,
        tagline: config.tagline ?? null,
        logoUrl: config.logoUrl ?? null,
      });
    } catch (err) {
      console.error('[public] getWebsiteConfig failed', err);
      res.json({ siteName: null, tagline: null, logoUrl: null });
    }
  })
);

/**
 * @openapi
 * /api/public/articles:
 *   get:
 *     summary: List published articles
 *     tags: [Public]
 */
router.get(
  '/articles',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const contentService = req.app.get('contentService') as ContentManagementService;
    const articles = await contentService.getPublishedArticles(limit);

    res.json({
      success: true,
      data: articles,
    });
  })
);

/**
 * @openapi
 * /api/public/articles/{id}:
 *   get:
 *     summary: Get published article by ID
 *     tags: [Public]
 */
router.get(
  '/articles/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const contentService = req.app.get('contentService') as ContentManagementService;
    const article = await contentService.getPublishedArticleById(id);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: `Published article with ID ${id} not found`,
        },
      });
    }

    res.json({
      success: true,
      data: article,
    });
  })
);

/**
 * GET /api/public/sitemap-slugs
 * Returns all public slugs for sitemap generation (products, categories, gadget brands+devices)
 */
router.get(
  '/sitemap-slugs',
  asyncHandler(async (req: Request, res: Response) => {
    const db = req.app.get('pool') as Pool;

    const [products, categories, gadgetBrands, gadgetDevices] = await Promise.all([
      db.query<{ slug: string; updated_at: string }>(
        `SELECT slug, updated_at FROM products WHERE is_active = true AND slug IS NOT NULL ORDER BY updated_at DESC LIMIT 5000`
      ),
      db.query<{ slug: string; updated_at: string }>(
        `SELECT slug, updated_at FROM categories WHERE slug IS NOT NULL`
      ),
      db.query<{ slug: string; updated_at: string }>(
        `SELECT slug, updated_at FROM gadget_brands WHERE is_active = true`
      ),
      db.query<{ brand_slug: string; slug: string; updated_at: string }>(
        `SELECT b.slug AS brand_slug, d.slug, d.updated_at
         FROM gadget_devices d
         JOIN gadget_brands b ON b.id = d.brand_id
         WHERE d.is_published = true`
      ),
    ]);

    res.json({
      products: products.rows,
      categories: categories.rows,
      gadgetBrands: gadgetBrands.rows,
      gadgetDevices: gadgetDevices.rows,
    });
  })
);

export default router;
