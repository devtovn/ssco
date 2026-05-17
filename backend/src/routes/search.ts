/**
 * Search Routes
 * REST API endpoints for product search
 */

import { Router, Request, Response } from 'express';
import { cachedSearchService } from '../services/CachedSearchService';
import { SearchQuerySchema, validate } from '@price-comparison/types';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search products
 *     description: Search products with filters, sorting, and pagination
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, price_asc, price_desc, popularity, newest]
 *           default: relevance
 *         description: Sort order
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
 *         description: Items per page (max 100)
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SearchResponse'
 *       400:
 *         description: Validation error
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Parse query parameters
    const queryParams: any = {
      keyword: req.query.keyword as string,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
    };

    // Optional filters
    if (req.query.categoryId) {
      queryParams.categoryId = parseInt(req.query.categoryId as string);
    }

    if (req.query.minPrice && req.query.maxPrice) {
      queryParams.priceRange = {
        min: parseFloat(req.query.minPrice as string),
        max: parseFloat(req.query.maxPrice as string),
      };
    }

    if (req.query.brand) {
      queryParams.brand = req.query.brand as string;
    }

    if (req.query.sortBy) {
      queryParams.sortBy = req.query.sortBy as string;
    }

    // Validate query
    const validation = validate(SearchQuerySchema, queryParams);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: validation.errors,
        },
      });
    }

    // Execute search
    const response = await cachedSearchService.searchProducts(validation.data!);

    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     description: Get autocomplete suggestions for search
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of suggestions
 *     responses:
 *       200:
 *         description: Suggestions retrieved successfully
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
 *                     $ref: '#/components/schemas/SearchSuggestion'
 *       400:
 *         description: Query too short
 */
router.get(
  '/suggestions',
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'QUERY_TOO_SHORT',
          message: 'Search query must be at least 2 characters',
        },
      });
    }

    const suggestions = await cachedSearchService.getSuggestions(query, limit);

    res.json({
      success: true,
      data: suggestions,
    });
  })
);

/**
 * @swagger
 * /api/search/popular-keywords:
 *   get:
 *     summary: Get popular keywords
 *     description: Get trending search keywords
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of keywords
 *     responses:
 *       200:
 *         description: Popular keywords retrieved successfully
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
 *                     $ref: '#/components/schemas/PopularKeyword'
 */
router.get(
  '/popular-keywords',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const keywords = await cachedSearchService.getPopularKeywords(limit);

    res.json({
      success: true,
      data: keywords,
    });
  })
);

export default router;
