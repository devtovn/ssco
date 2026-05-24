/**
 * Content Management Routes
 * AI article generation and review workflow (Reviewer / Administrator)
 */

import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { ContentManagementService } from '../services/ContentManagementService';

const router = Router();

const GenerateArticleSchema = z.object({
  keyword: z.string().min(2).max(200),
  productId: z.string().max(100).optional(),
  targetLength: z.number().int().min(300).max(5000).optional(),
  tone: z.enum(['professional', 'casual', 'technical']).optional(),
  includeComparison: z.boolean().optional(),
});

const EditArticleSchema = z.object({
  title: z.string().min(5).max(500).optional(),
  content: z.string().min(50).optional(),
  excerpt: z.string().max(500).optional(),
  seoMetadata: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      canonicalUrl: z.string().url().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      ogImage: z.string().url().optional(),
    })
    .optional(),
});

const RejectArticleSchema = z.object({
  reason: z.string().min(5).max(1000),
});

async function runAuth(
  req: AuthRequest,
  res: Response,
  roles: string[]
): Promise<boolean> {
  const authService = req.app.get('authService');
  const authMiddleware = authenticateJWT(authService);
  const roleMiddleware = requireRole(...roles);

  await new Promise<void>((resolve, reject) => {
    authMiddleware(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    roleMiddleware(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
  });

  return !res.headersSent;
}

/**
 * @openapi
 * /api/content/generate:
 *   post:
 *     summary: Generate article with AI
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/generate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const body = GenerateArticleSchema.parse(req.body);
    const contentService = req.app.get('contentService') as ContentManagementService;

    const article = await contentService.generateArticle({
      keyword: body.keyword,
      productId: body.productId,
      createdBy: req.user!.userId,
      options: {
        targetLength: body.targetLength,
        tone: body.tone,
        includeComparison: body.includeComparison,
      },
    });

    res.status(201).json(article);
  })
);

/**
 * @openapi
 * /api/content/{id}/edit:
 *   put:
 *     summary: Edit article draft
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id/edit',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const body = EditArticleSchema.parse(req.body);
    const contentService = req.app.get('contentService') as ContentManagementService;

    const article = await contentService.editArticle(req.params.id, {
      ...body,
      editedBy: req.user!.userId,
    });

    res.json(article);
  })
);

/**
 * @openapi
 * /api/content/{id}/submit:
 *   post:
 *     summary: Submit article for review
 *     tags: [Content]
 */
router.post(
  '/:id/submit',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const contentService = req.app.get('contentService') as ContentManagementService;
    const article = await contentService.submitForReview(req.params.id, req.user!.userId);
    res.json(article);
  })
);

/**
 * @openapi
 * /api/content/{id}/approve:
 *   post:
 *     summary: Approve article
 *     tags: [Content]
 */
router.post(
  '/:id/approve',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const contentService = req.app.get('contentService') as ContentManagementService;
    const article = await contentService.approveArticle(req.params.id, req.user!.userId);
    res.json(article);
  })
);

/**
 * @openapi
 * /api/content/{id}/reject:
 *   post:
 *     summary: Reject article with feedback
 *     tags: [Content]
 */
router.post(
  '/:id/reject',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const body = RejectArticleSchema.parse(req.body);
    const contentService = req.app.get('contentService') as ContentManagementService;
    const article = await contentService.rejectArticle(
      req.params.id,
      req.user!.userId,
      body.reason
    );
    res.json(article);
  })
);

/**
 * @openapi
 * /api/content/{id}/publish:
 *   post:
 *     summary: Publish approved article
 *     tags: [Content]
 */
router.post(
  '/:id/publish',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const contentService = req.app.get('contentService') as ContentManagementService;
    const article = await contentService.publishArticle(req.params.id, req.user!.userId);
    res.json(article);
  })
);

/**
 * @openapi
 * /api/content/pending:
 *   get:
 *     summary: List articles pending review
 *     tags: [Content]
 */
router.get(
  '/pending',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const contentService = req.app.get('contentService') as ContentManagementService;
    const articles = await contentService.getPendingArticles();
    res.json({ articles, count: articles.length });
  })
);

/**
 * @openapi
 * /api/content/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Content]
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const contentService = req.app.get('contentService') as ContentManagementService;
    const article = await contentService.getArticleById(req.params.id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found', code: 'NOT_FOUND' });
    }

    res.json(article);
  })
);

/**
 * @openapi
 * /api/content/{id}/versions:
 *   get:
 *     summary: Get article version history
 *     tags: [Content]
 */
router.get(
  '/:id/versions',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!(await runAuth(req, res, ['Reviewer', 'Administrator']))) return;

    const contentService = req.app.get('contentService') as ContentManagementService;
    const versions = await contentService.getArticleVersions(req.params.id);
    res.json({ versions });
  })
);

export default router;
