/**
 * GadgetService — CRUD for gadget_brands and gadget_devices.
 */
import { Pool } from 'pg';
import { pool } from '../config/database';

export interface GadgetBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  country?: string;
  isActive: boolean;
  sortOrder: number;
  deviceCount?: number;
}

export interface GadgetDevice {
  id: string;
  brandId: string;
  brandName?: string;
  brandSlug?: string;
  name: string;
  slug: string;
  category: 'mobile' | 'tablet' | 'smartwatch';
  imageUrl?: string;
  gsmarenaUrl?: string;
  announced?: string;
  released?: string;
  status?: string;
  specs: GadgetSpecs;
  isPublished: boolean;
  /** Linked product ID in the products table (for price lookup) */
  productId?: string;
  /** Linked product slug (for navigation to /san-pham/:slug) */
  productSlug?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GadgetSpecs {
  network?:       Record<string, string>;
  launch?:        Record<string, string>;
  body?:          Record<string, string>;
  display?:       Record<string, string>;
  platform?:      Record<string, string>;
  memory?:        Record<string, string>;
  main_camera?:   Record<string, string>;
  selfie_camera?: Record<string, string>;
  sound?:         Record<string, string>;
  comms?:         Record<string, string>;
  features?:      Record<string, string>;
  battery?:       Record<string, string>;
  misc?:          Record<string, string>;
  [section: string]: Record<string, string> | undefined;
}

function mapBrand(row: any): GadgetBrand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url ?? undefined,
    description: row.description ?? undefined,
    country: row.country ?? undefined,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    deviceCount: row.device_count !== undefined ? parseInt(row.device_count) : undefined,
  };
}

function mapDevice(row: any): GadgetDevice {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brand_name ?? undefined,
    brandSlug: row.brand_slug ?? undefined,
    name: row.name,
    slug: row.slug,
    category: row.category,
    imageUrl: row.image_url ?? undefined,
    gsmarenaUrl: row.gsmarena_url ?? undefined,
    announced: row.announced ?? undefined,
    released: row.released ?? undefined,
    status: row.status ?? undefined,
    specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : (row.specs ?? {}),
    isPublished: row.is_published,
    productId: row.product_id ?? undefined,
    productSlug: row.product_slug ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class GadgetService {
  constructor(private db: Pool = pool) {}

  // ── Brands ──────────────────────────────────────────────────────────────────

  async listBrands(includeInactive = false): Promise<GadgetBrand[]> {
    const { rows } = await this.db.query(
      `SELECT b.*,
              COUNT(d.id) FILTER (WHERE d.is_published = true) AS device_count
       FROM gadget_brands b
       LEFT JOIN gadget_devices d ON d.brand_id = b.id
       ${includeInactive ? '' : 'WHERE b.is_active = true'}
       GROUP BY b.id
       ORDER BY b.sort_order ASC, b.name ASC`
    );
    return rows.map(mapBrand);
  }

  async getBrandBySlug(slug: string): Promise<GadgetBrand | null> {
    const { rows } = await this.db.query(
      `SELECT b.*,
              COUNT(d.id) FILTER (WHERE d.is_published = true) AS device_count
       FROM gadget_brands b
       LEFT JOIN gadget_devices d ON d.brand_id = b.id
       WHERE b.slug = $1
       GROUP BY b.id`,
      [slug]
    );
    return rows[0] ? mapBrand(rows[0]) : null;
  }

  async upsertBrand(input: Partial<GadgetBrand> & { name: string; slug: string }): Promise<GadgetBrand> {
    const { rows } = await this.db.query(
      `INSERT INTO gadget_brands (name, slug, logo_url, description, country, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         logo_url = COALESCE(EXCLUDED.logo_url, gadget_brands.logo_url),
         description = COALESCE(EXCLUDED.description, gadget_brands.description),
         country = COALESCE(EXCLUDED.country, gadget_brands.country),
         is_active = EXCLUDED.is_active,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [
        input.name,
        input.slug,
        input.logoUrl ?? null,
        input.description ?? null,
        input.country ?? null,
        input.isActive ?? true,
        input.sortOrder ?? 0,
      ]
    );
    return mapBrand(rows[0]);
  }

  // ── Devices ─────────────────────────────────────────────────────────────────

  async listDevices(opts: {
    brandSlug?: string;
    category?: string;
    published?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ devices: GadgetDevice[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (opts.brandSlug) {
      conditions.push(`b.slug = $${i++}`);
      values.push(opts.brandSlug);
    }
    if (opts.category) {
      conditions.push(`d.category = $${i++}`);
      values.push(opts.category);
    }
    if (opts.published !== undefined) {
      conditions.push(`d.is_published = $${i++}`);
      values.push(opts.published);
    }
    if (opts.q) {
      conditions.push(`d.name ILIKE $${i++}`);
      values.push(`%${opts.q}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = opts.limit ?? 24;
    const offset = opts.offset ?? 0;

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id ${where}`,
      values
    );

    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       LEFT JOIN products p ON p.id = d.product_id
       ${where}
       ORDER BY d.name ASC
       LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset]
    );

    return {
      devices: rows.map(mapDevice),
      total: parseInt(countRes.rows[0].count),
    };
  }

  async getDeviceBySlug(slug: string): Promise<GadgetDevice | null> {
    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       LEFT JOIN products p ON p.id = d.product_id
       WHERE d.slug = $1`,
      [slug]
    );
    return rows[0] ? mapDevice(rows[0]) : null;
  }

  async getDevicesByIds(ids: string[]): Promise<GadgetDevice[]> {
    if (!ids.length) return [];
    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       LEFT JOIN products p ON p.id = d.product_id
       WHERE d.id = ANY($1) AND d.is_published = true`,
      [ids]
    );
    return rows.map(mapDevice);
  }

  async getDevicesBySlugs(slugs: string[]): Promise<GadgetDevice[]> {
    if (!slugs.length) return [];
    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       LEFT JOIN products p ON p.id = d.product_id
       WHERE d.slug = ANY($1) AND d.is_published = true`,
      [slugs]
    );
    // Return in the requested order
    const map = new Map(rows.map((r) => [r.slug, mapDevice(r)]));
    return slugs.map((s) => map.get(s)).filter(Boolean) as GadgetDevice[];
  }

  async upsertDevice(input: {
    brandId: string;
    name: string;
    slug: string;
    category: string;
    imageUrl?: string;
    gsmarenaUrl?: string;
    announced?: string;
    released?: string;
    status?: string;
    specs: GadgetSpecs;
    isPublished?: boolean;
  }): Promise<GadgetDevice> {
    const { rows } = await this.db.query(
      `INSERT INTO gadget_devices
         (brand_id, name, slug, category, image_url, gsmarena_url,
          announced, released, status, specs, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (slug) DO UPDATE SET
         brand_id    = EXCLUDED.brand_id,
         name        = EXCLUDED.name,
         category    = EXCLUDED.category,
         image_url   = COALESCE(EXCLUDED.image_url, gadget_devices.image_url),
         gsmarena_url= COALESCE(EXCLUDED.gsmarena_url, gadget_devices.gsmarena_url),
         announced   = COALESCE(EXCLUDED.announced, gadget_devices.announced),
         released    = COALESCE(EXCLUDED.released, gadget_devices.released),
         status      = COALESCE(EXCLUDED.status, gadget_devices.status),
         specs       = EXCLUDED.specs,
         is_published= EXCLUDED.is_published,
         updated_at  = NOW()
       RETURNING *`,
      [
        input.brandId,
        input.name,
        input.slug,
        input.category,
        input.imageUrl ?? null,
        input.gsmarenaUrl ?? null,
        input.announced ?? null,
        input.released ?? null,
        input.status ?? null,
        JSON.stringify(input.specs),
        input.isPublished ?? false,
      ]
    );
    const device = mapDevice(rows[0]);
    // Fetch with brand info
    return (await this.getDeviceBySlug(device.slug)) ?? device;
  }

  async updateSpecs(id: string, specs: GadgetSpecs): Promise<void> {
    await this.db.query(
      `UPDATE gadget_devices SET specs = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(specs), id]
    );
  }

  async setPublished(id: string, published: boolean): Promise<void> {
    await this.db.query(
      `UPDATE gadget_devices SET is_published = $1, updated_at = NOW() WHERE id = $2`,
      [published, id]
    );
  }

  async deleteDevice(id: string): Promise<void> {
    await this.db.query('DELETE FROM gadget_devices WHERE id = $1', [id]);
  }

  /** Find the gadget device linked to a given product slug */
  async getDeviceByProductSlug(productSlug: string): Promise<GadgetDevice | null> {
    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       JOIN products p ON p.id = d.product_id
       WHERE p.slug = $1
       LIMIT 1`,
      [productSlug]
    );
    return rows[0] ? mapDevice(rows[0]) : null;
  }

  /** Get price entries for the product linked to a gadget device */
  async getPricesForDevice(deviceSlug: string): Promise<{
    productId: string;
    productSlug: string;
    productName: string;
    prices: Array<{
      id: string; source: string; sourceUrl: string; affiliateUrl?: string;
      price: number; currency: string; isAvailable: boolean;
    }>;
  } | null> {
    const device = await this.getDeviceBySlug(deviceSlug);
    if (!device?.productId) return null;

    const { rows } = await this.db.query(
      `SELECT pe.id, pe.source_name AS source, pe.source_url, pe.affiliate_url,
              pe.price, pe.currency, pe.is_available,
              p.slug AS product_slug, p.name AS product_name
       FROM price_entries pe
       JOIN products p ON p.id = pe.product_id
       WHERE pe.product_id = $1
       ORDER BY pe.price ASC`,
      [device.productId]
    );

    if (!rows.length) return null;

    return {
      productId: device.productId,
      productSlug: rows[0].product_slug,
      productName: rows[0].product_name,
      prices: rows.map((r: any) => ({
        id: r.id,
        source: r.source,
        sourceUrl: r.source_url,
        affiliateUrl: r.affiliate_url ?? undefined,
        price: parseFloat(r.price),
        currency: r.currency,
        isAvailable: r.is_available,
      })),
    };
  }

  /** Link or unlink a gadget device to a product */
  async linkProduct(deviceId: string, productId: string | null): Promise<void> {
    await this.db.query(
      `UPDATE gadget_devices SET product_id = $1, updated_at = NOW() WHERE id = $2`,
      [productId, deviceId]
    );
  }

  /** Update brand metadata (logo, description, active state) */
  async updateBrand(
    id: string,
    updates: { logoUrl?: string; description?: string; isActive?: boolean; sortOrder?: number }
  ): Promise<void> {
    await this.db.query(
      `UPDATE gadget_brands
       SET logo_url    = COALESCE($1, logo_url),
           description = COALESCE($2, description),
           is_active   = COALESCE($3, is_active),
           sort_order  = COALESCE($4, sort_order),
           updated_at  = NOW()
       WHERE id = $5`,
      [
        updates.logoUrl ?? null,
        updates.description ?? null,
        updates.isActive ?? null,
        updates.sortOrder ?? null,
        id,
      ]
    );
  }
}

export const gadgetService = new GadgetService();
