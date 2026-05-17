import { Router, Response } from 'express';
import { CachedAffiliateLinkService } from '../services/CachedAffiliateLinkService';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

// Validation schemas
const AffiliateConfigInputSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required'),
  platformName: z.string().min(1, 'Platform name is required'),
  referCode: z.string().min(1, 'Refer code is required'),
  linkTemplate: z.string().min(1, 'Link template is required'),
  linkFormat: z.object({
    type: z.enum(['query_param', 'path_param', 'subdomain', 'custom']),
    parameterName: z.string().optional(),
    template: z.string().min(1, 'Format template is required'),
    exampleUrl: z.string().url('Example URL must be valid'),
  }),
  priority: z.number().int().min(0).optional(),
});

const AffiliateConfigUpdateSchema = AffiliateConfigInputSchema.partial();

const GenerateLinkSchema = z.object({
  productUrl: z.string().url('Product URL must be valid'),
  platformId: z.string().min(1, 'Platform ID is required'),
  campaignId: z.string().optional(),
});

const TrackClickSchema = z.object({
  platformId: z.string().min(1, 'Platform ID is required'),
  generatedLink: z.string().url('Generated link must be valid'),
  productId: z.string().min(1, 'Product ID is required'),
  userSession: z.string().min(1, 'User session is required'),
  userAgent: z.string().min(1, 'User agent is required'),
  referrer: z.string().url().optional(),
  campaignId: z.string().optional(),
});

const PerformanceQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  campaignId: z.string().optional(),
});

/**
 * @openapi
 * /api/affiliate/configs:
 *   get:
 *     summary: Get all affiliate configurations
 *     description: Retrieve all affiliate configurations with optional filtering
 *     tags: [Affiliate]
 *     parameters:
 *       - in: query
 *         name: isEnabled
 *         schema:
 *           type: boolean
 *         description: Filter by enabled status
 *       - in: query
 *         name: platformIds
 *         schema:
 *           type: string
 *         description: Comma-separated platform IDs
 *     responses:
 *       200:
 *         description: List of affiliate configurations
 */
router.get(
  '/configs',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const affiliateService = req.app.get('affiliateService') as CachedAffiliateLinkService;

    const filters: any = {};
    
    if (req.query.isEnabled !== undefined) {
      filters.isEnabled = req.query.isEnabled === 'true';
    }
    
    if (req.query.platformIds) {
      filters.platformIds = (req.query.platformIds as string).split(',');
    }

    const configs = await affiliateService.getAffiliateConfigs(filters);
    res.json(configs);
  })
);

/**
 * @openapi
 * /api/affiliate/configs:
 *   post:
 *     summary: Create affiliate configuration
 *     description: Create new affiliate configuration (Admin only)
 *     tags: [Affiliate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platformId
 *               - platformName
 *               - referCode
 *               - linkTemplate
 *               - linkFormat
 *             properties:
 *               platformId:
 *                 type: string
 *               platformName:
 *                 type: string
 *               referCode:
 *                 type: string
 *               linkTemplate:
 *                 type: string
 *               linkFormat:
 *                 type: object
 *               priority:
 *                 type: number
 *     responses:
 *       201:
 *         description: Configuration created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/configs',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    const authMiddleware = authenticateJWT(authService);
    
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const roleMiddleware = requireRole('Administrator');
    await new Promise<void>((resolve, reject) => {
      roleMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const validation = AffiliateConfigInputSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    const affiliateService = req.app.get('affiliateService') as CachedAffiliateLinkService;
    const config = await affiliateService.createAffiliateConfig(validation.data);

    res.status(201).json(config);
  })
);

/**
 * @openapi
 * /api/affiliate/configs/{platformId}:
 *   put:
 *     summary: Update affiliate configuration
 *     description: Update existing affiliate configuration (Admin only)
 *     tags: [Affiliate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuration updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Configuration not found
 */
router.put(
  '/configs/:platformId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    const authMiddleware = authenticateJWT(authService);
    
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const roleMiddleware = requireRole('Administrator');
    await new Promise<void>((resolve, reject) => {
      roleMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const validation = AffiliateConfigUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    const affiliateService = req.app.get('affiliateService') as CachedAffiliateLinkService;
    
    try {
      const config = await affiliateService.updateAffiliateConfig(
        req.params.platformId,
        validation.data
      );
      res.json(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      if (message.includes('not found')) {
        return res.status(404).json({ error: message, code: 'NOT_FOUND' });
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /api/affiliate/configs/{platformId}:
 *   delete:
 *     summary: Delete affiliate configuration
 *     description: Delete affiliate configuration (Admin only)
 *     tags: [Affiliate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Configuration not found
 */
router.delete(
  '/configs/:platformId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    const authMiddleware = authenticateJWT(authService);
    
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const roleMiddleware = requireRole('Administrator');
    await new Promise<void>((resolve, reject) => {
      roleMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const affiliateService = req.app.get('affiliateService') as CachedAffiliateLinkService;
    
    try {
      await affiliateService.deleteAffiliateConfig(req.params.platformId);
      res.json({ message: 'Configuration deleted successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      if (message.includes('not found')) {
        return res.status(404).json({ error: message, code: 'NOT_FOUND' });
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /api/affiliate/generate-link:
 *   post:
 *     summary: Generate affiliate link
 *     description: Generate affiliate link for a product URL
 *     tags: [Affiliate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productUrl
 *               - platformId
 *             properties:
 *               productUrl:
 *                 type: string
 *               platformId:
 *                 type: string
 *               campaignId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Affiliate link generated
 */
router.post(
  '/generate-link',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = GenerateLinkSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    const affiliateService = req.app.get('affiliateService') as CachedAffiliateLinkService;
    const { productUrl, platformId, campaignId } = validation.data;

    const affiliateLink = await affiliateService.generateAffiliateLink(
      productUrl,
      platformId,
      campaignId
    );

    res.json({
      originalUrl: productUrl,
      affiliateLink,
      platformId,
      campaignId,
    });
  })
);

/**
 * @openapi
 * /api/affiliate/track-click:
 *   post:
 *     summary: Track affiliate link click
 *     description: Record affiliate link click with metadata
 *     tags: [Affiliate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platformId
 *               - generatedLink
 *               - productId
 *               - userSession
 *               - userAgent
 *             properties:
 *               platformId:
 *                 type: string
 *               generatedLink:
 *                 type: string
 *               productId:
 *                 type: string
 *               userSession:
 *                 type: string
 *               userAgent:
 *                 type: string
 *               referrer:
 *                 type: string
 *               campaignId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Click tracked
 */
router.post(
  '/track-click',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = TrackClickSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    const affiliateService = req.app.get('affiliateService') as CachedAffiliateLinkService;
    const { platformId, generatedLink, productId, userSession, userAgent, referrer, campaignId } = validation.data;

    const clickId = await affiliateService.trackAffiliateLinkClick(
      platformId,
      generatedLink,
      {
        productId,
        userSession,
        userAgent,
        referrer,
        campaignId,
      }
    );

    res.json({
      clickId,
      message: 'Click tracked successfully',
    });
  })
);

/**
 * @openapi
 * /api/affiliate/performance/{platformId}:
 *   get:
 *     summary: Get affiliate performance
 *     description: Get performance metrics for a platform (Admin only)
 *     tags: [Affiliate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: platformId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Performance metrics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/performance/:platformId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    const authMiddleware = authenticateJWT(authService);
    
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const roleMiddleware = requireRole('Administrator');
    await new Promise<void>((resolve, reject) => {
      roleMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const validation = PerformanceQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    const affiliateService = req.app.get('affiliateService') as CachedAffiliateLinkService;
    const { startDate, endDate, campaignId } = validation.data;
    const dateRange = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };

    let performance;
    if (campaignId) {
      performance = await affiliateService.getCampaignPerformance(
        req.params.platformId,
        campaignId,
        dateRange
      );
    } else {
      performance = await affiliateService.getAffiliatePerformance(
        req.params.platformId,
        dateRange
      );
    }

    res.json(performance);
  })
);

export default router;
