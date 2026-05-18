/**
 * Price Routes
 * REST API endpoints for price comparison
 */

import { Router, Request, Response } from 'express';
import { cachedPriceService } from '../services/CachedPriceService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /api/products/{id}/prices:
 *   get:
 *     summary: Get product prices
 *     description: Get price comparison from all sources for a product
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Price comparison retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PriceComparison'
 *       404:
 *         description: Product not found
 */
router.get(
  '/:id/prices',
  asyncHandler(async (req: Request, res: Response) => {
    const productId = req.params.id;
    
    try {
      const comparison = await cachedPriceService.getProductPrices(productId);
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
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
 * /api/products/{id}/price-history:
 *   get:
 *     summary: Get price history
 *     description: Get historical price data for a product
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source (optional)
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Price history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PriceHistory'
 *       404:
 *         description: Product not found
 */
router.get(
  '/:id/price-history',
  asyncHandler(async (req: Request, res: Response) => {
    const productId = req.params.id;
    const source = req.query.source as string | undefined;
    const days = parseInt(req.query.days as string) || 30;
    
    // Validate days parameter
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DAYS',
          message: 'Days must be between 1 and 365',
        },
      });
    }
    
    try {
      const history = await cachedPriceService.getPriceHistory(productId, source, days);
      
      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
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
 * /api/deals:
 *   get:
 *     summary: Get best deals
 *     description: Get products with significant price discounts
 *     tags: [Prices]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of deals (max 100)
 *       - in: query
 *         name: minDiscount
 *         schema:
 *           type: number
 *           default: 10
 *         description: Minimum discount percentage
 *     responses:
 *       200:
 *         description: Best deals retrieved successfully
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
 *                     $ref: '#/components/schemas/Deal'
 */
router.get(
  '/deals',
  asyncHandler(async (req: Request, res: Response) => {
    const categoryId = req.query.categoryId
      ? parseInt(req.query.categoryId as string)
      : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const minDiscount = parseFloat(req.query.minDiscount as string) || 10;
    
    // Validate parameters
    if (minDiscount < 0 || minDiscount > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DISCOUNT',
          message: 'Minimum discount must be between 0 and 100',
        },
      });
    }
    
    const deals = await cachedPriceService.getBestDeals(categoryId, limit, minDiscount);
    
    res.json({
      success: true,
      data: deals,
    });
  })
);

/**
 * @swagger
 * /api/products/{id}/price-statistics:
 *   get:
 *     summary: Get price statistics
 *     description: Get statistical analysis of product prices
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Price statistics retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get(
  '/:id/price-statistics',
  asyncHandler(async (req: Request, res: Response) => {
    const productId = req.params.id;
    
    try {
      const stats = await cachedPriceService.getPriceStatistics(productId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: error.message,
          },
        });
      }
      throw error;
    }
  })
);

export default router;
