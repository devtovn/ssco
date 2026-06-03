/**
 * Admin Gadget routes
 * POST /api/admin/gadget/crawl          — crawl GSMArena URL, return preview
 * POST /api/admin/gadget/devices        — save crawled/manual device
 * PUT  /api/admin/gadget/devices/:id    — update specs
 * POST /api/admin/gadget/devices/:id/publish
 * DELETE /api/admin/gadget/devices/:id
 * GET  /api/admin/gadget/devices        — list all (including unpublished)
 * PUT  /api/admin/gadget/brands/:id     — update brand logo/name
 */

import { Router, Response } from 'express';
import { authenticateJWT, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { gadgetService } from '../services/GadgetService';
import { gadgetCrawlerService } from '../services/GadgetCrawlerService';
import type { AdminService } from '../services/AdminService';

const router = Router();

async function requireAdmin(req: AuthRequest, res: Response): Promise<void> {
  const authService = req.app.get('authService');
  await new Promise<void>((resolve, reject) => {
    authenticateJWT(authService)(req, res, (err?: any) => (err ? reject(err) : resolve()));
  });
  await new Promise<void>((resolve, reject) => {
    requireRole('Administrator')(req, res, (err?: any) => (err ? reject(err) : resolve()));
  });
}

// ── POST /search — keyword search on GSMArena ─────────────────────────────────

router.post(
  '/search',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const { keyword } = z.object({ keyword: z.string().min(2) }).parse(req.body);
    const results = await gadgetCrawlerService.searchGSMArena(keyword);
    return res.json(results);
  })
);

// ── POST /crawl ───────────────────────────────────────────────────────────────

router.post(
  '/crawl',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const { url } = z.object({ url: z.string().url() }).parse(req.body);
    const result = await gadgetCrawlerService.crawlGSMArena(url);
    return res.json(result);
  })
);

// ── POST /devices — save device ───────────────────────────────────────────────

const DeviceSchema = z.object({
  brandId:     z.string().length(26),
  name:        z.string().min(1),
  slug:        z.string().min(1),
  category:    z.enum(['mobile', 'tablet', 'smartwatch']),
  imageUrl:    z.string().url().optional().or(z.literal('')),
  gsmarenaUrl: z.string().url().optional().or(z.literal('')),
  announced:   z.string().optional(),
  released:    z.string().optional(),
  status:      z.string().optional(),
  specs:       z.record(z.record(z.string())).default({}),
  isPublished: z.boolean().default(false),
});

router.post(
  '/devices',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const body = DeviceSchema.parse(req.body);

    // Respect auto-publish site config setting
    let isPublished = body.isPublished;
    try {
      const svc = req.app.get('adminService') as AdminService;
      const cfg = await svc.getWebsiteConfig();
      if ((cfg as any).metadata?.gadget_auto_publish === true) {
        isPublished = true;
      }
    } catch (err) { console.error('[admin-gadget] getWebsiteConfig failed, falling back to body value', err); }

    const device = await gadgetService.upsertDevice({
      ...body,
      imageUrl: body.imageUrl || undefined,
      gsmarenaUrl: body.gsmarenaUrl || undefined,
      isPublished,
    });
    return res.status(201).json(device);
  })
);

// ── GET /devices — list all ───────────────────────────────────────────────────

router.get(
  '/devices',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const brand = req.query.brand as string | undefined;
    const category = req.query.category as string | undefined;
    const page = parseInt(req.query.page as string || '1');
    const limit = 50;

    const { devices, total } = await gadgetService.listDevices({
      brandSlug: brand,
      category,
      limit,
      offset: (page - 1) * limit,
    });
    return res.json({ devices, pagination: { page, limit, total } });
  })
);

// ── PUT /devices/:id — update ─────────────────────────────────────────────────

router.put(
  '/devices/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const body = DeviceSchema.partial().parse(req.body);
    if (body.specs) {
      await gadgetService.updateSpecs(req.params.id, body.specs as any);
    }
    if (body.isPublished !== undefined) {
      await gadgetService.setPublished(req.params.id, body.isPublished);
    }
    return res.json({ ok: true });
  })
);

// ── POST /devices/:id/publish ─────────────────────────────────────────────────

router.post(
  '/devices/:id/publish',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const { published } = z.object({ published: z.boolean() }).parse(req.body);
    await gadgetService.setPublished(req.params.id, published);
    return res.json({ ok: true });
  })
);

// ── POST /devices/:id/link-product ───────────────────────────────────────────

router.post(
  '/devices/:id/link-product',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const { productId } = z.object({
      productId: z.string().length(26).nullable(),
    }).parse(req.body);

    await gadgetService.linkProduct(req.params.id, productId);
    return res.json({ ok: true });
  })
);

// ── DELETE /devices/:id ───────────────────────────────────────────────────────

router.delete(
  '/devices/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    await gadgetService.deleteDevice(req.params.id);
    return res.json({ ok: true });
  })
);

// ── PUT /brands/:id ───────────────────────────────────────────────────────────

router.put(
  '/brands/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await requireAdmin(req, res);
    if (res.headersSent) return;

    const body = z.object({
      logoUrl:     z.string().url().optional().or(z.literal('')),
      description: z.string().optional(),
      isActive:    z.boolean().optional(),
      sortOrder:   z.number().optional(),
    }).parse(req.body);

    await gadgetService.updateBrand(req.params.id, {
      logoUrl: body.logoUrl || undefined,
      description: body.description,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    });
    return res.json({ ok: true });
  })
);

export default router;
