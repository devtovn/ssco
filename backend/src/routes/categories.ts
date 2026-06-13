/**
 * Category Routes
 * REST API endpoints for category management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { cachedCategoryService } from '../services/CachedCategoryService';
import {
  CategoryInputSchema,
  CategoryUpdateSchema,
  validate,
} from '@kombe/types';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/categories/tree:
 *   get:
 *     summary: Get category tree
 *     description: Returns hierarchical category tree structure
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: rootId
 *         schema:
 *           type: integer
 *         description: Root category ID (optional, returns all if not provided)
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CategoryTree'
 */
router.get(
  '/tree',
  asyncHandler(async (req: Request, res: Response) => {
    const rootId = req.query.rootId ? parseInt(req.query.rootId as string) : undefined;
    
    const tree = await cachedCategoryService.getCategoryTree(rootId);
    
    res.json({
      success: true,
      data: tree,
    });
  })
);

/**
 * @swagger
 * /api/categories/{id}/products:
 *   get:
 *     summary: Get products by category
 *     description: Returns products in a category with pagination
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *       - in: query
 *         name: includeSubcategories
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include products from subcategories
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get(
  '/:id/products',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const includeSubcategories = req.query.includeSubcategories !== 'false';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    // Verify category exists
    const category = await cachedCategoryService.getCategoryById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: `Category with ID ${id} not found`,
        },
      });
    }
    
    const result = await cachedCategoryService.getProductsByCategory(
      id,
      includeSubcategories,
      page,
      limit
    );
    
    res.json({
      success: true,
      data: result.products,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  })
);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     description: Creates a new category (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.post(
  '/',
  // TODO: Add authentication middleware
  // TODO: Add authorization middleware (admin only)
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validation = validate(CategoryInputSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validation.errors,
        },
      });
    }
    
    const category = await cachedCategoryService.createCategory(validation.data!);
    
    res.status(201).json({
      success: true,
      data: category,
    });
  })
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     description: Updates an existing category (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryUpdate'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Category not found
 */
router.put(
  '/:id',
  // TODO: Add authentication middleware
  // TODO: Add authorization middleware (admin only)
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Validate request body
    const validation = validate(CategoryUpdateSchema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validation.errors,
        },
      });
    }
    
    try {
      const category = await cachedCategoryService.updateCategory(id, validation.data!);
      
      res.json({
        success: true,
        data: category,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: error.message,
          },
        });
      }
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     description: Deletes a category (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *       - in: query
 *         name: cascade
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Delete all child categories
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with children or products
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 *       404:
 *         description: Category not found
 */
router.delete(
  '/:id',
  // TODO: Add authentication middleware
  // TODO: Add authorization middleware (admin only)
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const cascade = req.query.cascade === 'true';
    
    try {
      await cachedCategoryService.deleteCategory(id, cascade);
      
      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: error.message,
          },
        });
      }
      if (error.message.includes('Cannot delete')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_DELETE_CATEGORY',
            message: error.message,
          },
        });
      }
      throw error;
    }
  })
);

/**
 * @swagger
 * /api/categories/{id}/metrics:
 *   get:
 *     summary: Get category metrics
 *     description: Returns analytics metrics for a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get(
  '/:id/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Verify category exists
    const category = await cachedCategoryService.getCategoryById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: `Category with ID ${id} not found`,
        },
      });
    }
    
    const metrics = await cachedCategoryService.getCategoryMetrics(id);
    
    res.json({
      success: true,
      data: metrics,
    });
  })
);

/**
 * @swagger
 * /api/categories/slug/{slug}:
 *   get:
 *     summary: Get category by slug
 *     description: Returns a single category by URL slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Category slug
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get(
  '/slug/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const category = await cachedCategoryService.getCategoryBySlug(slug);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: `Category with slug "${slug}" not found`,
        },
      });
    }

    res.json({
      success: true,
      data: category,
    });
  })
);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     description: Returns a single category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const category = await cachedCategoryService.getCategoryById(id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: `Category with ID ${id} not found`,
        },
      });
    }
    
    res.json({
      success: true,
      data: category,
    });
  })
);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     description: Returns a flat list of all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Return only active categories
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.activeOnly !== 'false';
    
    const categories = await cachedCategoryService.getAllCategories(activeOnly);
    
    res.json({
      success: true,
      data: categories,
    });
  })
);

export default router;
