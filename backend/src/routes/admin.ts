/**
 * Admin Routes
 * REST API endpoints for admin operations
 */

import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const router = Router();

// Validation schemas
const WebsiteConfigSchema = z.object({
  logo: z.string().url().optional(),
  siteName: z.string().min(1).max(200).optional(),
  tagline: z.string().max(500).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  font: z.string().optional(),
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
 *                 logo:
 *                   type: string
 *                   format: uri
 *                 siteName:
 *                   type: string
 *                 tagline:
 *                   type: string
 *                 primaryColor:
 *                   type: string
 *                 secondaryColor:
 *                   type: string
 *                 font:
 *                   type: string
 *                 metadata:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get(
  '/config',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const pool = req.app.get('pool') as Pool;

    // Get website config from database or return defaults
    const result = await pool.query(
      `SELECT config_data FROM website_config WHERE id = 1`
    );

    if (result.rows.length === 0) {
      // Return default configuration
      return res.json({
        logo: '',
        siteName: 'Price Comparison',
        tagline: 'So sánh giá tốt nhất',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        font: 'Inter',
        metadata: {},
      });
    }

    res.json(result.rows[0].config_data);
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
 *               logo:
 *                 type: string
 *                 format: uri
 *               siteName:
 *                 type: string
 *               tagline:
 *                 type: string
 *               primaryColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               secondaryColor:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               font:
 *                 type: string
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

    const validation = WebsiteConfigSchema.safeParse(req.body);
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

    const pool = req.app.get('pool') as Pool;

    // Upsert website config
    const result = await pool.query(
      `INSERT INTO website_config (id, config_data, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id)
       DO UPDATE SET config_data = $1, updated_at = NOW()
       RETURNING config_data`,
      [JSON.stringify(validation.data)]
    );

    res.json({
      message: 'Configuration updated successfully',
      config: result.rows[0].config_data,
    });
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

    const pool = req.app.get('pool') as Pool;

    let query = `
      SELECT id, email, role, permissions, is_active as "isActive", 
             created_at as "createdAt", last_login as "lastLogin"
      FROM users
      WHERE role = 'Reviewer'
    `;

    const params: any[] = [];

    if (req.query.isActive !== undefined) {
      query += ` AND is_active = $1`;
      params.push(req.query.isActive === 'true');
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
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

    const pool = req.app.get('pool') as Pool;
    const { email, password, permissions } = validation.data;

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Email already exists',
        code: 'EMAIL_EXISTS',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create reviewer
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, permissions, is_active)
       VALUES ($1, $2, 'Reviewer', $3, true)
       RETURNING id, email, role, permissions, is_active as "isActive", created_at as "createdAt"`,
      [email, passwordHash, JSON.stringify(permissions || {})]
    );

    res.status(201).json({
      message: 'Reviewer created successfully',
      reviewer: result.rows[0],
    });
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

    const pool = req.app.get('pool') as Pool;
    const { id } = req.params;
    const updates = validation.data;

    // Check if reviewer exists
    const existingUser = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Reviewer not found',
        code: 'NOT_FOUND',
      });
    }

    if (existingUser.rows[0].role !== 'Reviewer') {
      return res.status(400).json({
        error: 'User is not a reviewer',
        code: 'INVALID_ROLE',
      });
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.email) {
      // Check if new email already exists
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [updates.email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          error: 'Email already exists',
          code: 'EMAIL_EXISTS',
        });
      }

      updateFields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }

    if (updates.password) {
      const passwordHash = await bcrypt.hash(updates.password, 10);
      updateFields.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (updates.permissions !== undefined) {
      updateFields.push(`permissions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.permissions));
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        code: 'NO_UPDATES',
      });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, role, permissions, is_active as "isActive", 
                created_at as "createdAt", updated_at as "updatedAt", last_login as "lastLogin"
    `;

    const result = await pool.query(query, values);

    res.json({
      message: 'Reviewer updated successfully',
      reviewer: result.rows[0],
    });
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

    const pool = req.app.get('pool') as Pool;
    const { id } = req.params;

    // Check if reviewer exists
    const existingUser = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        error: 'Reviewer not found',
        code: 'NOT_FOUND',
      });
    }

    if (existingUser.rows[0].role !== 'Reviewer') {
      return res.status(400).json({
        error: 'User is not a reviewer',
        code: 'INVALID_ROLE',
      });
    }

    // Delete reviewer
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      message: 'Reviewer deleted successfully',
    });
  })
);

export default router;
