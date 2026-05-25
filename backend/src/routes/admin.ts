/**
 * Admin Routes
 * REST API endpoints for admin operations
 */

import { Router, Response } from 'express';
import { Pool } from 'pg';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { CacheService, CacheKeys } from '../utils/cache';
import { AdminService } from '../services/AdminService';
import { cachedCategoryService } from '../services/CachedCategoryService';

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

// ─── Categories ──────────────────────────────────────────────────────────────

const CategoryReorderSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1),
    parentId: z.string().nullable(),
    displayOrder: z.number().int().min(0),
  })).min(1).max(500),
});

router.post(
  '/categories/reorder',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const { updates } = CategoryReorderSchema.parse(req.body);
    await cachedCategoryService.reorderCategories(updates);
    res.json({ success: true, updated: updates.length });
  })
);

// ─── Products ────────────────────────────────────────────────────────────────

router.get(
  '/products',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService');
    await new Promise<void>((resolve, reject) => {
      authenticateJWT(authService)(req, res, (err?: any) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      requireRole('Administrator')(req, res, (err?: any) => (err ? reject(err) : resolve()));
    });

    const pool = req.app.get('pool') as Pool;
    const category = (req.query.category as string) || null;
    const q = (req.query.q as string) || null;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number | null)[] = [];

    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      conditions.push(`(p.name ILIKE $${i} OR p.brand ILIKE $${i} OR p.model ILIKE $${i})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT p.id, p.name, p.brand, p.model, p.category AS category_slug,
              c.name_vi AS category_name,
              p.is_active, p.created_at,
              p.hidden_sources,
              COUNT(DISTINCT pe.id)::int AS price_count,
              MIN(pe.price) AS min_price,
              MAX(pe.price) AS max_price,
              ARRAY(SELECT DISTINCT pe2.source_name FROM price_entries pe2
                    WHERE pe2.product_id = p.id AND pe2.is_available = true) AS available_sources
       FROM products p
       LEFT JOIN categories c ON c.slug = p.category
       LEFT JOIN price_entries pe ON pe.product_id = p.id AND pe.is_available = true
       ${where}
       GROUP BY p.id, p.name, p.brand, p.model, p.category, c.name_vi, p.is_active, p.created_at, p.hidden_sources
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  })
);

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  hiddenSources: z.array(z.string().max(100)).optional(),
});

const BulkUpdateProductsSchema = z.object({
  ids: z.array(z.string().min(1).max(26)).min(1).max(200),
  isActive: z.boolean(),
});

async function requireAdmin(req: AuthRequest, res: Response) {
  const authService = req.app.get('authService');
  await new Promise<void>((resolve, reject) => {
    authenticateJWT(authService)(req, res, (err?: any) => (err ? reject(err) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    requireRole('Administrator')(req, res, (err?: any) => (err ? reject(err) : resolve()));
  });
}

// Must be registered before /:id to avoid "bulk" being matched as an id
router.patch(
  '/products/bulk',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const { ids, isActive } = BulkUpdateProductsSchema.parse(req.body);
    const pool = req.app.get('pool') as Pool;

    await pool.query(
      `UPDATE products SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::text[])`,
      [isActive, ids]
    );

    res.json({ updated: ids.length });
  })
);

router.patch(
  '/products/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const body = UpdateProductSchema.parse(req.body);
    const { id } = req.params;
    const pool = req.app.get('pool') as Pool;

    const setClauses: string[] = [];
    const vals: unknown[] = [];

    if (body.name !== undefined) {
      vals.push(body.name);
      setClauses.push(`name = $${vals.length}`);
    }
    if (body.category !== undefined) {
      vals.push(body.category);
      setClauses.push(`category = $${vals.length}`);
    }
    if (body.isActive !== undefined) {
      vals.push(body.isActive);
      setClauses.push(`is_active = $${vals.length}`);
    }
    if (body.hiddenSources !== undefined) {
      vals.push(body.hiddenSources);
      setClauses.push(`hidden_sources = $${vals.length}`);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Không có trường nào để cập nhật' });
    }

    setClauses.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${vals.length}
       RETURNING id, name, category, is_active, slug`,
      vals
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
    }

    // Invalidate price cache keyed by both id and slug so the detail page reflects changes immediately
    const updated = result.rows[0];
    await Promise.all([
      CacheService.delete(CacheKeys.PRODUCT_PRICES(updated.id)),
      CacheService.delete(CacheKeys.PRODUCT_PRICES(updated.slug)),
    ]);

    res.json({ product: updated });
  })
);

export default router;
