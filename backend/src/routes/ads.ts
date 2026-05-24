/**
 * Advertisement Routes
 * REST API endpoints for advertisement management
 */

import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { CachedAdvertisementService } from '../services/CachedAdvertisementService';

const router = Router();

// Validation schemas
const AdDimensionsSchema = z.object({
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive'),
  unit: z.enum(['px', '%', 'rem']),
});

const AdConfigurationSchema = z.object({
  displayTiming: z
    .object({
      delayMs: z.number().min(0).optional(),
      durationMs: z.number().min(0).optional(),
      frequency: z.enum(['once', 'always', 'session']).optional(),
    })
    .optional(),
  targeting: z
    .object({
      pages: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      devices: z.array(z.enum(['mobile', 'tablet', 'desktop'])).optional(),
    })
    .optional(),
  styling: z
    .object({
      backgroundColor: z.string().optional(),
      borderRadius: z.string().optional(),
      padding: z.string().optional(),
      margin: z.string().optional(),
    })
    .optional(),
});

const CreateAdZoneSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  position: z.enum(['header', 'footer', 'sidebar', 'in-content', 'overlay', 'floating']),
  dimensions: AdDimensionsSchema,
  configuration: AdConfigurationSchema.optional(),
});

const UpdateAdZoneSchema = z.object({
  dimensions: AdDimensionsSchema.optional(),
  configuration: AdConfigurationSchema.optional(),
  isActive: z.boolean().optional(),
});

const TrackAdEventSchema = z.object({
  adId: z.string().length(26, 'Invalid ad ID'),
  type: z.enum(['impression', 'click']),
  metadata: z
    .object({
      userSession: z.string().optional(),
      userAgent: z.string().optional(),
      referrer: z.string().optional(),
      page: z.string().optional(),
    })
    .optional(),
});

/**
 * @openapi
 * /api/ads/zones:
 *   get:
 *     summary: Get all advertisement zones
 *     description: Retrieve all advertisement zones with optional filtering
 *     tags: [Advertisements]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *           enum: [header, footer, sidebar, in-content, overlay, floating]
 *         description: Filter by position
 *     responses:
 *       200:
 *         description: List of advertisement zones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   position:
 *                     type: string
 *                   dimensions:
 *                     type: object
 *                   configuration:
 *                     type: object
 *                   isActive:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 */
router.get(
  '/zones',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const adService = req.app.get('adService') as CachedAdvertisementService;

    const filters: any = {};

    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }

    if (req.query.position) {
      filters.position = req.query.position as string;
    }

    const zones = await adService.getAdZones(filters);
    res.json(zones);
  })
);

/**
 * @openapi
 * /api/ads/zones:
 *   post:
 *     summary: Create advertisement zone
 *     description: Create a new advertisement zone with position and size configuration (Admin only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - position
 *               - dimensions
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 200
 *                 example: Homepage Header Banner
 *               position:
 *                 type: string
 *                 enum: [header, footer, sidebar, in-content, overlay, floating]
 *                 example: header
 *               dimensions:
 *                 type: object
 *                 required:
 *                   - width
 *                   - height
 *                   - unit
 *                 properties:
 *                   width:
 *                     type: number
 *                     example: 728
 *                   height:
 *                     type: number
 *                     example: 90
 *                   unit:
 *                     type: string
 *                     enum: [px, '%', rem]
 *                     example: px
 *               configuration:
 *                 type: object
 *                 properties:
 *                   displayTiming:
 *                     type: object
 *                     properties:
 *                       delayMs:
 *                         type: number
 *                       durationMs:
 *                         type: number
 *                       frequency:
 *                         type: string
 *                         enum: [once, always, session]
 *                   targeting:
 *                     type: object
 *                     properties:
 *                       pages:
 *                         type: array
 *                         items:
 *                           type: string
 *                       categories:
 *                         type: array
 *                         items:
 *                           type: string
 *                       devices:
 *                         type: array
 *                         items:
 *                           type: string
 *                           enum: [mobile, tablet, desktop]
 *                   styling:
 *                     type: object
 *                     properties:
 *                       backgroundColor:
 *                         type: string
 *                       borderRadius:
 *                         type: string
 *                       padding:
 *                         type: string
 *                       margin:
 *                         type: string
 *     responses:
 *       201:
 *         description: Advertisement zone created successfully
 *       400:
 *         description: Validation error or zone name already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.post(
  '/zones',
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

    const validation = CreateAdZoneSchema.safeParse(req.body);
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

    const adService = req.app.get('adService') as CachedAdvertisementService;

    try {
      const zone = await adService.createAdZone(validation.data);
      res.status(201).json({
        message: 'Advertisement zone created successfully',
        zone,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Create failed';
      if (message.includes('already exists')) {
        return res.status(400).json({
          error: message,
          code: 'ZONE_EXISTS',
        });
      }
      if (message.includes('Invalid')) {
        return res.status(400).json({
          error: message,
          code: 'VALIDATION_ERROR',
        });
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /api/ads/zones/{id}:
 *   put:
 *     summary: Update advertisement zone
 *     description: Update advertisement zone placement and configuration (Admin only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement zone ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dimensions:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: number
 *                   height:
 *                     type: number
 *                   unit:
 *                     type: string
 *                     enum: [px, '%', rem]
 *               configuration:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Advertisement zone updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Zone not found
 */
router.put(
  '/zones/:id',
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

    const validation = UpdateAdZoneSchema.safeParse(req.body);
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

    const adService = req.app.get('adService') as CachedAdvertisementService;
    const { id } = req.params;

    try {
      const zone = await adService.updateAdPlacement(id, validation.data);
      res.json({
        message: 'Advertisement zone updated successfully',
        zone,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      if (message.includes('not found')) {
        return res.status(404).json({
          error: message,
          code: 'NOT_FOUND',
        });
      }
      if (message.includes('Invalid')) {
        return res.status(400).json({
          error: message,
          code: 'VALIDATION_ERROR',
        });
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /api/ads/zones/{id}:
 *   delete:
 *     summary: Delete advertisement zone
 *     description: Delete an advertisement zone (Admin only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement zone ID
 *     responses:
 *       200:
 *         description: Advertisement zone deleted successfully
 *       400:
 *         description: Cannot delete zone with active advertisements
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Zone not found
 */
router.delete(
  '/zones/:id',
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

    const adService = req.app.get('adService') as CachedAdvertisementService;
    const { id } = req.params;

    try {
      await adService.deleteAdZone(id);
      res.json({
        message: 'Advertisement zone deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      if (message.includes('not found')) {
        return res.status(404).json({
          error: message,
          code: 'NOT_FOUND',
        });
      }
      if (message.includes('Cannot delete')) {
        return res.status(400).json({
          error: message,
          code: 'CANNOT_DELETE',
        });
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /api/ads/track:
 *   post:
 *     summary: Track advertisement event
 *     description: Track advertisement impressions and clicks
 *     tags: [Advertisements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adId
 *               - type
 *             properties:
 *               adId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               type:
 *                 type: string
 *                 enum: [impression, click]
 *                 example: impression
 *               metadata:
 *                 type: object
 *                 properties:
 *                   userSession:
 *                     type: string
 *                   userAgent:
 *                     type: string
 *                   referrer:
 *                     type: string
 *                   page:
 *                     type: string
 *     responses:
 *       200:
 *         description: Event tracked successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Advertisement not found
 */
router.post(
  '/track',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = TrackAdEventSchema.safeParse(req.body);
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

    const adService = req.app.get('adService') as CachedAdvertisementService;
    const { adId, type, metadata } = validation.data;

    try {
      await adService.trackAdPerformance(adId, {
        type,
        timestamp: new Date(),
        metadata,
      });

      res.json({
        message: 'Event tracked successfully',
        adId,
        type,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tracking failed';
      if (message.includes('not found')) {
        return res.status(404).json({
          error: message,
          code: 'NOT_FOUND',
        });
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /api/ads/performance/{zoneId}:
 *   get:
 *     summary: Get advertisement performance metrics
 *     description: Get performance metrics for an advertisement zone (Admin only)
 *     tags: [Advertisements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema:
 *           type: string
 *         description: Advertisement zone ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: number
 *           default: 30
 *         description: Number of days to include in metrics
 *     responses:
 *       200:
 *         description: Performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 zoneId:
 *                   type: string
 *                 zoneName:
 *                   type: string
 *                 totalImpressions:
 *                   type: number
 *                 totalClicks:
 *                   type: number
 *                 ctr:
 *                   type: number
 *                   description: Click-through rate percentage
 *                 averageImpressions:
 *                   type: number
 *                 averageClicks:
 *                   type: number
 *                 performanceByDate:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       impressions:
 *                         type: number
 *                       clicks:
 *                         type: number
 *                       ctr:
 *                         type: number
 *                 performanceByAd:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       adId:
 *                         type: string
 *                       adType:
 *                         type: string
 *                       impressions:
 *                         type: number
 *                       clicks:
 *                         type: number
 *                       ctr:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Zone not found
 */
router.get(
  '/performance/:zoneId',
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

    const adService = req.app.get('adService') as CachedAdvertisementService;
    const { zoneId } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;

    try {
      const metrics = await adService.getPerformanceMetrics(zoneId, days);
      res.json(metrics);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get metrics';
      if (message.includes('not found')) {
        return res.status(404).json({
          error: message,
          code: 'NOT_FOUND',
        });
      }
      throw error;
    }
  })
);

export default router;
