/**
 * Analytics Routes
 * REST API endpoints for usage tracking and admin reporting
 */

import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { AnalyticsService } from '../services/AnalyticsService';

const router = Router();

const TrackInteractionSchema = z.object({
  eventType: z.enum(['page_view', 'click', 'product_view', 'search']),
  pagePath: z.string().optional(),
  productId: z.string().max(100).optional(),
  targetUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  userSession: z.string().max(200).optional(),
  userAgent: z.string().optional(),
  referrer: z.string().optional(),
});

const TrackSearchSchema = z.object({
  query: z.string().min(1).max(500),
  category: z.string().max(100).optional(),
  filters: z.record(z.unknown()).optional(),
  resultsCount: z.number().int().min(0),
  userSession: z.string().max(200).optional(),
  userAgent: z.string().optional(),
});

/**
 * @openapi
 * /api/analytics/track:
 *   post:
 *     summary: Track public user interaction
 *     description: Records page views, clicks, and product views (no auth required)
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventType]
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [page_view, click, product_view, search]
 *     responses:
 *       204:
 *         description: Event tracked
 */
router.post(
  '/track',
  asyncHandler(async (req, res: Response) => {
    const analyticsService = req.app.get('analyticsService') as AnalyticsService;
    const body = TrackInteractionSchema.parse(req.body);

    await analyticsService.trackUserInteraction({
      eventType: body.eventType,
      pagePath: body.pagePath,
      productId: body.productId,
      targetUrl: body.targetUrl,
      metadata: body.metadata,
      userSession: body.userSession,
      userAgent: body.userAgent || req.headers['user-agent'],
      referrer: body.referrer || req.headers.referer as string | undefined,
    });

    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/analytics/track-search:
 *   post:
 *     summary: Track search query
 *     description: Records search analytics (no auth required)
 *     tags: [Analytics]
 *     responses:
 *       204:
 *         description: Search tracked
 */
router.post(
  '/track-search',
  asyncHandler(async (req, res: Response) => {
    const analyticsService = req.app.get('analyticsService') as AnalyticsService;
    const body = TrackSearchSchema.parse(req.body);

    await analyticsService.trackSearchQuery({
      query: body.query,
      category: body.category,
      filters: body.filters,
      resultsCount: body.resultsCount,
      userSession: body.userSession,
      userAgent: body.userAgent || req.headers['user-agent'],
    });

    res.status(204).send();
  })
);

/**
 * @openapi
 * /api/analytics/popular-products:
 *   get:
 *     summary: Get popular products
 *     description: Returns most viewed products (Administrator only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: Popular products list
 */
router.get(
  '/popular-products',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    const authMiddleware = authenticateJWT(authService);
    const adminOnly = requireRole('Administrator');

    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      adminOnly(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });

    if (res.headersSent) return;

    const analyticsService = req.app.get('analyticsService') as AnalyticsService;
    const days = parseInt((req.query.days as string) || '7', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const products = await analyticsService.getPopularProducts(days, limit);
    res.json({ products, days, limit });
  })
);

/**
 * @openapi
 * /api/analytics/search-trends:
 *   get:
 *     summary: Get search trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/search-trends',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    const authMiddleware = authenticateJWT(authService);
    const adminOnly = requireRole('Administrator');

    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      adminOnly(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });

    if (res.headersSent) return;

    const analyticsService = req.app.get('analyticsService') as AnalyticsService;
    const days = parseInt((req.query.days as string) || '7', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);

    const trends = await analyticsService.getSearchTrends(days, limit);
    res.json({ trends, days, limit });
  })
);

/**
 * @openapi
 * /api/analytics/system-performance:
 *   get:
 *     summary: Get system performance metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/system-performance',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    const authMiddleware = authenticateJWT(authService);
    const adminOnly = requireRole('Administrator');

    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      adminOnly(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });

    if (res.headersSent) return;

    const analyticsService = req.app.get('analyticsService') as AnalyticsService;
    const metrics = await analyticsService.getSystemPerformance();
    res.json(metrics);
  })
);

/**
 * @openapi
 * /api/analytics/reports:
 *   get:
 *     summary: Generate analytics report
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/reports',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    const authMiddleware = authenticateJWT(authService);
    const adminOnly = requireRole('Administrator');

    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      adminOnly(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });

    if (res.headersSent) return;

    const analyticsService = req.app.get('analyticsService') as AnalyticsService;
    const days = parseInt((req.query.days as string) || '7', 10);
    const report = await analyticsService.generateReport(days);
    res.json(report);
  })
);

export default router;
