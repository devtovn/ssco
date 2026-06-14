/**
 * Admin product CSV import
 * POST /api/admin/import/products
 */

import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { productImportService } from '../services/ProductImportService';

const router = Router();

const ImportProductsSchema = z.object({
  platform: z.enum(['tiki']),
  csv: z.string().min(1, 'Nội dung CSV trống'),
});

async function requireAdmin(req: AuthRequest, res: Response): Promise<void> {
  const authService = req.app.get('authService');
  await new Promise<void>((resolve, reject) => {
    authenticateJWT(authService)(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    requireRole('Administrator')(req, res, (err?: unknown) => (err ? reject(err) : resolve()));
  });
}

router.post(
  '/products',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const body = ImportProductsSchema.parse(req.body);

    if (body.platform === 'tiki') {
      const result = await productImportService.importTikiCsv(body.csv);
      return res.json({ success: true, ...result });
    }

    return res.status(400).json({ error: 'Platform không được hỗ trợ' });
  })
);

export default router;
