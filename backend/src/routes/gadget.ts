/**
 * Gadget public routes
 * GET /api/gadget/brands
 * GET /api/gadget/brands/:slug/devices
 * GET /api/gadget/devices/:slug
 * GET /api/gadget/compare?slugs=slug1,slug2,slug3
 * GET /api/gadget/search?q=...&category=...
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { gadgetService } from '../services/GadgetService';

const router = Router();

// GET /brands
router.get(
  '/brands',
  asyncHandler(async (_req: Request, res: Response) => {
    const brands = await gadgetService.listBrands(false);
    return res.json(brands);
  })
);

// GET /brands/:slug/devices
router.get(
  '/brands/:slug/devices',
  asyncHandler(async (req: Request, res: Response) => {
    const brand = await gadgetService.getBrandBySlug(req.params.slug);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });

    const category = req.query.category as string | undefined;
    const page = parseInt(req.query.page as string || '1');
    const limit = 24;

    const { devices, total } = await gadgetService.listDevices({
      brandSlug: req.params.slug,
      category,
      published: true,
      limit,
      offset: (page - 1) * limit,
    });

    return res.json({ brand, devices, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  })
);

// GET /devices/:slug
router.get(
  '/devices/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const device = await gadgetService.getDeviceBySlug(req.params.slug);
    if (!device || !device.isPublished) return res.status(404).json({ error: 'Device not found' });
    return res.json(device);
  })
);

// GET /compare?slugs=s1,s2,s3,s4
router.get(
  '/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const raw = (req.query.slugs as string) || '';
    const slugs = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
    if (slugs.length < 2) {
      return res.status(400).json({ error: 'Cần ít nhất 2 thiết bị để so sánh' });
    }
    const devices = await gadgetService.getDevicesBySlugs(slugs);
    return res.json(devices);
  })
);

// GET /devices/:slug/prices — price entries for the linked product
router.get(
  '/devices/:slug/prices',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await gadgetService.getPricesForDevice(req.params.slug);
    if (!result) return res.json(null);
    return res.json(result);
  })
);

// GET /by-product/:productSlug — gadget specs for a product
router.get(
  '/by-product/:productSlug',
  asyncHandler(async (req: Request, res: Response) => {
    const device = await gadgetService.getDeviceByProductSlug(req.params.productSlug);
    if (!device) return res.json(null);
    return res.json(device);
  })
);

// GET /search?q=&category=&brand=
router.get(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    const category = req.query.category as string | undefined;
    const brandSlug = req.query.brand as string | undefined;
    const page = parseInt(req.query.page as string || '1');
    const limit = 24;

    const { devices, total } = await gadgetService.listDevices({
      q: q || undefined,
      category,
      brandSlug,
      published: true,
      limit,
      offset: (page - 1) * limit,
    });

    return res.json({ devices, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  })
);

export default router;
