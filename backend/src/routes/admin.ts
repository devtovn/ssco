/**
 * Admin Routes
 * REST API endpoints for admin operations
 */

import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { AdminService } from '../services/AdminService';

const router = Router();

// Validation schemas
const WebsiteConfigUpdateSchema = z.object({
  logoUrl: z.string().url().optional(),
  siteName: z.string().min(1).max(200).optional(),
  tagline: z.string().max(500).optional(),
  theme: z.object({
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    fontFamily: z.string().optional(),
  }).optional(),
  branding: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const CreateReviewerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  permissions: z.record(z.boolean()).optional(),
});

const UpdateReviewerSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  permissions: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * @openapi
 * /api/admin/config:
 *   get:
 *     summary: Get website configuration
 *     description: Retrieve current website configuration settings
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Website configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 logoUrl:
 *                   type: string
 *                   format: uri
 *                 siteName:
 *                   type: string
 *                 tagline:
 *                   type: string
 *                 theme:
 *                   type: object
 *                   properties:
 *                     primaryColor:
 *                       type: string
 *                     secondaryColor:
 *                       type: string
 *                     fontFamily:
 *                       type: string
 *                 branding:
 *                   type: object
 *                 metadata:
 *                   type: object
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */
router.get(
  '/config',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminService = req.app.get('adminService') as AdminService;

    try {
      const config = await adminService.getWebsiteConfig();
      res.json(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get configuration';
      if (message.includes('not found')) {
        return res.status(404).json({
          error: message,
          code: 'CONFIG_NOT_FOUND',
        });
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /api/admin/config:
 *   put:
 *     summary: Update website configuration
 *     description: Update website configuration settings (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *               siteName:
 *                 type: string
 *               tagline:
 *                 type: string
 *               theme:
 *                 type: object
 *                 properties:
 *                   primaryColor:
 *                     type: string
 *                     pattern: '^#[0-9A-Fa-f]{6}$'
 *                   secondaryColor:
 *                     type: string
 *                     pattern: '^#[0-9A-Fa-f]{6}$'
 *                   fontFamily:
 *                     type: string
 *               branding:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Configuration not found
 */
router.put(
  '/config',
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

    const validation = WebsiteConfigUpdateSchema.safeParse(req.body);
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

    const adminService = req.app.get('adminService') as AdminService;

    try {
      const config = await adminService.updateWebsiteConfig(validation.data);
      res.json({
        message: 'Configuration updated successfully',
        config,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      if (message.includes('not found')) {
        return res.status(404).json({
          error: message,
          code: 'CONFIG_NOT_FOUND',
        });
      }
      throw error;
    }
  })
);

/**
 * @openapi
 * /api/admin/reviewers:
 *   get:
 *     summary: Get all reviewers
 *     description: Retrieve list of all reviewer accounts (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email (partial match)
 *     responses:
 *       200:
 *         description: List of reviewers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   email:
 *                     type: string
 *                   role:
 *                     type: string
 *                   permissions:
 *                     type: object
 *                   isActive:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                   lastLogin:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.get(
  '/reviewers',
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

    const adminService = req.app.get('adminService') as AdminService;

    const filters: any = {};
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }
    if (req.query.email) {
      filters.email = req.query.email as string;
    }

    const reviewers = await adminService.getReviewers(filters);
    res.json(reviewers);
  })
);

/**
 * @openapi
 * /api/admin/reviewers:
 *   post:
 *     summary: Create reviewer account
 *     description: Create a new reviewer account (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               permissions:
 *                 type: object
 *     responses:
 *       201:
 *         description: Reviewer created successfully
 *       400:
 *         description: Validation error or email already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.post(
  '/reviewers',
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

    const validation = CreateReviewerSchema.safeParse(req.body);
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

    const adminService = req.app.get('adminService') as AdminService;

    try {
      const reviewer = await adminService.createReviewer(validation.data);
      res.status(201).json({
        message: 'Reviewer created successfully',
        reviewer,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Create failed';
      if (message.includes('already exists')) {
        return res.status(400).json({
          error: message,
          code: 'EMAIL_EXISTS',
        });
      }
      if (message.includes('Invalid email') || message.includes('Password must')) {
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
 * /api/admin/reviewers/{id}:
 *   put:
 *     summary: Update reviewer account
 *     description: Update reviewer account details (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reviewer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               permissions:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Reviewer updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Reviewer not found
 */
router.put(
  '/reviewers/:id',
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

    const validation = UpdateReviewerSchema.safeParse(req.body);
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

    const adminService = req.app.get('adminService') as AdminService;
    const { id } = req.params;

    try {
      const reviewer = await adminService.updateReviewer(id, validation.data);
      res.json({
        message: 'Reviewer updated successfully',
        reviewer,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed';
      if (message.includes('not found')) {
        return res.status(404).json({
          error: message,
          code: 'NOT_FOUND',
        });
      }
      if (message.includes('already exists')) {
        return res.status(400).json({
          error: message,
          code: 'EMAIL_EXISTS',
        });
      }
      if (message.includes('Invalid email') || message.includes('Password must')) {
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
 * /api/admin/reviewers/{id}:
 *   delete:
 *     summary: Delete reviewer account
 *     description: Delete a reviewer account (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reviewer ID
 *     responses:
 *       200:
 *         description: Reviewer deleted successfully
 *       400:
 *         description: Cannot delete reviewer with associated articles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Reviewer not found
 */
router.delete(
  '/reviewers/:id',
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

    const adminService = req.app.get('adminService') as AdminService;
    const { id } = req.params;

    try {
      await adminService.deleteReviewer(id);
      res.json({
        message: 'Reviewer deleted successfully',
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

export default router;
