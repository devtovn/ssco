/**
 * Seed Routes  (Admin only)
 * POST /api/admin/seed/preview  — fetch & cross-search without writing to DB
 * POST /api/admin/seed/save     — upsert product + price entries
 * POST /api/admin/seed/refresh/:id — refresh prices for an existing product
 */

import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { dataCollectionService } from '../services/DataCollectionService';
import { PlatformAPIService } from '../services/PlatformAPIService';
import {
  generateAffiliateLinkForPlatform,
  PlatformCredentials,
} from '../services/PlatformAffiliateService';
import { CachedAffiliateLinkService } from '../services/CachedAffiliateLinkService';

const router = Router();

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAdmin(req: AuthRequest, res: Response): Promise<void> {
  const authService = req.app.get('authService');
  await new Promise<void>((resolve, reject) => {
    authenticateJWT(authService)(req, res, (err?: any) => (err ? reject(err) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    requireRole('Administrator')(req, res, (err?: any) => (err ? reject(err) : resolve()));
  });
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const PreviewSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('url'),
    url: z.string().url('URL không hợp lệ'),
  }),
  z.object({
    type: z.literal('keyword'),
    keyword: z.string().min(2, 'Từ khóa tối thiểu 2 ký tự').max(200),
  }),
]);

const NormalizedProductSchema = z.object({
  externalId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  price: z.number().min(0),
  currency: z.string().default('VND'),
  isAvailable: z.boolean(),
  images: z.array(z.string()),
  sourceUrl: z.string(),
  source: z.string(),
  affiliateUrl: z.string().url().optional().or(z.literal('')),
  specifications: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const SaveSchema = z.object({
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  categorySlug: z.string().min(1),
  // primary product — its name/brand/images become the DB product
  primary: NormalizedProductSchema,
  // all price entries to save (must include primary)
  entries: z.array(NormalizedProductSchema).min(1),
});

// ── POST /preview ─────────────────────────────────────────────────────────────

router.post(
  '/preview',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const body = PreviewSchema.parse(req.body);

    // Platforms that need an official API key (check env vars)
    const unavailable = PlatformAPIService.KEY_REQUIRED_PLATFORMS.filter((p) => {
      if (p.platform === 'shopee') return !process.env.SHOPEE_PARTNER_ID || !process.env.SHOPEE_PARTNER_KEY;
      if (p.platform === 'lazada') return !process.env.LAZADA_API_KEY;
      if (p.platform === 'tiktok') return !process.env.TIKTOK_SHOP_API_KEY;
      return true;
    });

    if (body.type === 'url') {
      const result = await dataCollectionService.previewFromUrl(body.url);
      return res.json({ ...result, unavailable });
    }

    // keyword mode
    const results = await dataCollectionService.previewFromKeyword(body.keyword);
    return res.json({ primary: null, platformResults: results, unavailable });
  })
);

// ── POST /save ────────────────────────────────────────────────────────────────

router.post(
  '/save',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const body = SaveSchema.parse(req.body);

    const result = await dataCollectionService.upsertSeedProduct({
      primary: body.primary as any,
      entries: body.entries as any,
      categoryId: body.categoryId,
      categorySlug: body.categorySlug,
    });

    return res.status(201).json(result);
  })
);

// ── POST /refresh/:id ─────────────────────────────────────────────────────────

router.post(
  '/refresh/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const { id } = req.params;
    const result = await dataCollectionService.refreshProductPrices(id);
    return res.json(result);
  })
);

// ── POST /generate-affiliate ──────────────────────────────────────────────────
// Called from the seed page to generate an affiliate URL at seed time.
// Looks up stored credentials for the platform, calls the appropriate API,
// returns { affiliateUrl } to be pasted into the entry before saving.

const GenerateAffiliateSchema = z.object({
  sourceUrl: z.string().url(),
  platformId: z.enum(['tiki', 'shopee', 'tiktok', 'lazada']),
});

router.post(
  '/generate-affiliate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const body = GenerateAffiliateSchema.parse(req.body);
    const affiliateService = req.app.get('affiliateService') as CachedAffiliateLinkService;

    // Load stored credentials for this platform
    const config = await affiliateService.getAffiliateConfigByPlatform(body.platformId);
    if (!config || !config.isEnabled) {
      return res.status(404).json({
        error: `Chưa cấu hình affiliate cho sàn "${body.platformId}". Vào Admin → Affiliate để thêm.`,
      });
    }

    const rawCreds = (config as any).credentials;
    if (!rawCreds) {
      return res.status(400).json({
        error: `Thiếu credentials cho "${body.platformId}". Vào Admin → Affiliate để cập nhật.`,
      });
    }

    // Build typed credentials
    let creds: PlatformCredentials;
    try {
      creds = { platform: body.platformId, ...rawCreds } as PlatformCredentials;
    } catch (err) {
      console.error('[seed] build credentials failed', err);
      return res.status(400).json({ error: 'Credentials không hợp lệ.' });
    }

    const result = await generateAffiliateLinkForPlatform(body.sourceUrl, creds);
    return res.json({ affiliateUrl: result.affiliateUrl, method: result.method });
  })
);

export default router;
