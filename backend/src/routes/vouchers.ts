/**
 * Voucher Routes
 * Public read + Admin CRUD for vouchers
 */

import { Router, Request, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { query, queryRead } from '../config/database';

const router = Router();

const VoucherSchema = z.object({
  code:        z.string().min(1).max(100).transform((s) => s.trim().toUpperCase()),
  description: z.string().min(1).max(500),
  source:      z.enum(['tiki', 'shopee', 'lazada', 'tiktok']),
  type:        z.enum(['cashback', 'shipping', 'discount']),
  expires_at:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  is_active:   z.boolean().optional().default(true),
});

const UpdateVoucherSchema = VoucherSchema.partial();

// ─── PUBLIC ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/vouchers
 * Returns active, non-expired vouchers. Optional ?source= filter.
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const source = req.query.source as string | undefined;

  const params: unknown[] = [];
  let where = `WHERE is_active = true AND expires_at >= CURRENT_DATE`;

  if (source) {
    params.push(source.toLowerCase());
    where += ` AND source = $${params.length}`;
  }

  const result = await queryRead(
    `SELECT id, code, description, source, type,
            TO_CHAR(expires_at, 'DD/MM/YYYY') AS expires
     FROM vouchers
     ${where}
     ORDER BY source, expires_at ASC`,
    params
  );

  res.json({ vouchers: result.rows });
}));

// ─── ADMIN CRUD ─────────────────────────────────────────────────────────────

router.use(authenticateJWT, requireRole(['Administrator']));

/**
 * GET /api/v1/vouchers/all — all vouchers including expired (admin)
 */
router.get('/all', asyncHandler(async (_req: Request, res: Response) => {
  const result = await queryRead(
    `SELECT id, code, description, source, type, is_active,
            TO_CHAR(expires_at, 'DD/MM/YYYY') AS expires,
            expires_at::text AS expires_iso,
            created_at
     FROM vouchers
     ORDER BY source, expires_at DESC`
  );
  res.json({ vouchers: result.rows });
}));

/**
 * POST /api/v1/vouchers
 */
router.post('/', asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = VoucherSchema.parse(req.body);
  const result = await query(
    `INSERT INTO vouchers (code, description, source, type, expires_at, is_active)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, code, description, source, type, is_active,
               TO_CHAR(expires_at,'DD/MM/YYYY') AS expires, expires_at::text AS expires_iso`,
    [data.code, data.description, data.source, data.type, data.expires_at, data.is_active]
  );
  res.status(201).json({ voucher: result.rows[0] });
}));

/**
 * PUT /api/v1/vouchers/:id
 */
router.put('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = UpdateVoucherSchema.parse(req.body);
  const { id } = req.params;

  const fields = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k], i) => `${k} = $${i + 2}`);

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const values = Object.values(data).filter((v) => v !== undefined);
  const result = await query(
    `UPDATE vouchers
     SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING id, code, description, source, type, is_active,
               TO_CHAR(expires_at,'DD/MM/YYYY') AS expires, expires_at::text AS expires_iso`,
    [id, ...values]
  );

  if (result.rowCount === 0) return res.status(404).json({ error: 'Voucher not found' });
  res.json({ voucher: result.rows[0] });
}));

/**
 * DELETE /api/v1/vouchers/:id
 */
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `DELETE FROM vouchers WHERE id = $1 RETURNING id`,
    [req.params.id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Voucher not found' });
  res.json({ success: true });
}));

export default router;
