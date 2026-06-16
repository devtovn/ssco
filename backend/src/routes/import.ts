/**
 * Admin product CSV import
 * POST /api/admin/import/products
 *
 * Accepts either:
 * - JSON body: { platform: "tiki", csv: "..." }
 * - Raw CSV file: Content-Type text/csv + ?platform=tiki
 */

import express, { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { productImportService } from '../services/ProductImportService';

const router = Router();

const BODY_LIMIT = process.env.JSON_BODY_LIMIT || '100mb';
const IMPORT_TIMEOUT_MS = parseInt(process.env.IMPORT_TIMEOUT_MS || String(30 * 60 * 1000), 10);

const csvTextParser = express.text({
  type: ['text/csv', 'text/plain', 'application/octet-stream'],
  limit: BODY_LIMIT,
});

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

function resolveCsvPayload(req: AuthRequest): { platform: 'tiki'; csv: string } {
  const contentType = req.headers['content-type'] ?? '';
  const isRawCsv =
    typeof req.body === 'string' &&
    req.body.length > 0 &&
    !contentType.includes('application/json');

  if (isRawCsv) {
    const platform = (req.query.platform as string) || 'tiki';
    if (platform !== 'tiki') {
      throw new Error('Platform không được hỗ trợ');
    }
    return { platform: 'tiki', csv: req.body };
  }

  return ImportProductsSchema.parse(req.body);
}

router.post(
  '/products',
  csvTextParser,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    req.setTimeout(IMPORT_TIMEOUT_MS);
    res.setTimeout(IMPORT_TIMEOUT_MS);

    await requireAdmin(req, res);
    if (res.headersSent) return;

    const { platform, csv } = resolveCsvPayload(req);

    if (platform === 'tiki') {
      const result = await productImportService.importTikiCsv(csv);
      return res.json({ success: true, ...result });
    }

    return res.status(400).json({ error: 'Platform không được hỗ trợ' });
  })
);

export default router;
