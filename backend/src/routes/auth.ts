import { Router, Request, Response } from 'express';
import { AuthenticationService } from '../services/AuthenticationService';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';

const router = Router();

// Validation schemas
const LoginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: Authenticate user and return JWT tokens
 *     tags: [Authentication]
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
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123456
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [Administrator, Reviewer]
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: number
 *                 redirectUrl:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = LoginSchema.safeParse(req.body);
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

    const authService = req.app.get('authService') as AuthenticationService;
    const { email, password } = validation.data;

    try {
      const { user, tokens } = await authService.login({ email, password });

      // Determine redirect URL based on role
      const redirectUrl =
        user.role === 'Administrator' ? '/admin' : '/reviewer';

      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        },
        tokens,
        redirectUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(401).json({
        error: message,
        code: 'AUTH_FAILED',
      });
    }
  })
);


/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *       400:
 *         description: Validation error
 */
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = RefreshTokenSchema.safeParse(req.body);
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

    const authService = req.app.get('authService') as AuthenticationService;
    const { refreshToken } = validation.data;

    await authService.logout(refreshToken);

    res.json({
      message: 'Logout successful',
    });
  })
);


/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get new access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = RefreshTokenSchema.safeParse(req.body);
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

    const authService = req.app.get('authService') as AuthenticationService;
    const { refreshToken } = validation.data;

    try {
      const tokens = await authService.refreshAccessToken(refreshToken);

      res.json({ tokens });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Token refresh failed';
      res.status(401).json({
        error: message,
        code: 'REFRESH_FAILED',
      });
    }
  })
);


/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     description: Get authenticated user information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     permissions:
 *                       type: object
 *                     isActive:
 *                       type: boolean
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authService = req.app.get('authService') as AuthenticationService;
    
    // Use authenticateJWT middleware inline
    const authMiddleware = authenticateJWT(authService);
    
    // Apply middleware
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Get full user details from database
    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      },
    });
  })
);

export default router;
