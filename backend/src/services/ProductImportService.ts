/**
 * Product CSV import — affiliate export files (Tiki first).
 */

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { slugify } from './PlatformAPIService';

const TIKI_HEADERS = ['sku', 'name', 'url', 'price', 'discount', 'image', 'desc', 'category', 'keywords'] as const;

export interface ImportRowError {
  row: number;
  sku?: string;
  message: string;
}

export interface ImportResult {
  platform: string;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
}

export interface TikiCsvRow {
  sku: string;
  name: string;
  url: string;
  discount: number;
  image?: string;
  desc?: string;
  categoryName: string;
  keywords: string[];
}

/** Parse RFC4180-style CSV (quoted fields, commas inside quotes). */
export function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || (c === '\r' && next === '\n')) {
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      if (c === '\r') i++;
    } else if (c !== '\r') {
      field += c;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

/** Category name from CSV (already normalized — use as categories.name_vi). */
export function parseTikiCategoryName(raw: string): string {
  return raw.replace(/&gt;/gi, '>').replace(/&amp;/gi, '&').trim();
}

/** Parse keywords cell: `"a","b","c"` or plain comma-separated. */
export function parseTikiKeywords(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const quoted: string[] = [];
  const re = /"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed)) !== null) {
    const kw = match[1].trim();
    if (kw) quoted.push(kw);
  }
  if (quoted.length > 0) return quoted;

  return trimmed
    .split(',')
    .map((s) => s.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
}

function parseTikiRows(csv: string): { rows: TikiCsvRow[]; errors: ImportRowError[] } {
  const parsed = parseCsvRows(csv.trim());
  if (parsed.length === 0) {
    return { rows: [], errors: [{ row: 0, message: 'File CSV trống' }] };
  }

  const header = parsed[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  for (const col of TIKI_HEADERS) {
    if (!header.includes(col)) {
      return { rows: [], errors: [{ row: 1, message: `Thiếu cột bắt buộc: ${col}` }] };
    }
  }

  const colIndex = Object.fromEntries(header.map((h, i) => [h, i])) as Record<
    (typeof TIKI_HEADERS)[number],
    number
  >;

  const rows: TikiCsvRow[] = [];
  const errors: ImportRowError[] = [];

  for (let i = 1; i < parsed.length; i++) {
    const cells = parsed[i];
    const rowNum = i + 1;
    const get = (key: (typeof TIKI_HEADERS)[number]) =>
      (cells[colIndex[key]] ?? '').trim().replace(/^"|"$/g, '');

    const sku = get('sku');
    const name = get('name');
    const url = get('url');
    const discountRaw = get('discount');
    const discount = parseFloat(discountRaw);

    if (!sku) {
      errors.push({ row: rowNum, message: 'Thiếu sku' });
      continue;
    }
    if (!name) {
      errors.push({ row: rowNum, sku, message: 'Thiếu name' });
      continue;
    }
    if (!url) {
      errors.push({ row: rowNum, sku, message: 'Thiếu url' });
      continue;
    }
    if (!Number.isFinite(discount) || discount <= 0) {
      errors.push({ row: rowNum, sku, message: `Giá discount không hợp lệ: ${discountRaw}` });
      continue;
    }

    const categoryRaw = get('category');
    const categoryName = categoryRaw ? parseTikiCategoryName(categoryRaw) : '';
    if (!categoryName) {
      errors.push({ row: rowNum, sku, message: 'Thiếu category' });
      continue;
    }

    const keywords = parseTikiKeywords(get('keywords'));
    const image = get('image') || undefined;
    const desc = get('desc') || undefined;

    rows.push({ sku, name, url, discount, image, desc, categoryName, keywords });
  }

  return { rows, errors };
}

export class ProductImportService {
  constructor(private db: Pool = pool) {}

  async importTikiCsv(csv: string): Promise<ImportResult> {
    const { rows, errors: parseErrors } = parseTikiRows(csv);
    const result: ImportResult = {
      platform: 'tiki',
      total: rows.length + parseErrors.length,
      created: 0,
      updated: 0,
      failed: parseErrors.length,
      errors: [...parseErrors],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2 + parseErrors.length;
      try {
        const action = await this.upsertTikiRow(row);
        if (action === 'created') result.created++;
        else result.updated++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          sku: row.sku,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    result.total = rows.length + parseErrors.length;
    return result;
  }

  private async upsertTikiRow(row: TikiCsvRow): Promise<'created' | 'updated'> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const category = await this.resolveCategory(client, row.categoryName);
      const existing = await client.query<{ id: string; product_id: string }>(
        `SELECT id, product_id FROM price_entries
         WHERE source_name = 'tiki' AND external_id = $1
         LIMIT 1`,
        [row.sku]
      );

      if (existing.rows.length > 0) {
        const { id: priceEntryId, product_id: productId } = existing.rows[0];

        await client.query(
          `UPDATE products SET
             name = $1,
             description = $2,
             images = $3,
             category = $4,
             keywords = $5,
             updated_at = NOW()
           WHERE id = $6`,
          [
            row.name,
            row.desc ?? null,
            row.image ? [row.image] : null,
            category.slug,
            row.keywords,
            productId,
          ]
        );

        await client.query(
          `INSERT INTO product_categories (product_id, category_id, is_primary)
           VALUES ($1, $2, true)
           ON CONFLICT (product_id, category_id) DO UPDATE SET is_primary = true`,
          [productId, category.id]
        );

        await client.query(
          `UPDATE price_entries SET
             source_url = $1,
             price = $2,
             currency = 'VND',
             is_available = true,
             metadata = NULL,
             scraped_at = NOW()
           WHERE id = $3`,
          [row.url, row.discount, priceEntryId]
        );

        await client.query('COMMIT');
        return 'updated';
      }

      const slug = await this.resolveUniqueProductSlug(client, slugify(row.name) || `tiki-${row.sku}`);

      const productRes = await client.query<{ id: string }>(
        `INSERT INTO products
           (name, slug, description, category, brand, images, keywords, is_active, hidden_sources, source_type)
         VALUES ($1, $2, $3, $4, NULL, $5, $6, false, '{}', 'tiki')
         RETURNING id`,
        [
          row.name,
          slug,
          row.desc ?? null,
          category.slug,
          row.image ? [row.image] : null,
          row.keywords,
        ]
      );

      const productId = productRes.rows[0].id;

      await client.query(
        `INSERT INTO product_categories (product_id, category_id, is_primary)
         VALUES ($1, $2, true)
         ON CONFLICT (product_id, category_id) DO NOTHING`,
        [productId, category.id]
      );

      await client.query(
        `INSERT INTO price_entries
           (product_id, source_name, external_id, source_url, price, currency, is_available, metadata, scraped_at)
         VALUES ($1, 'tiki', $2, $3, $4, 'VND', true, NULL, NOW())`,
        [productId, row.sku, row.url, row.discount]
      );

      await client.query('COMMIT');
      return 'created';
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async resolveCategory(
    client: PoolClient,
    nameVi: string
  ): Promise<{ id: string; slug: string }> {
    const found = await client.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM categories WHERE name_vi = $1 LIMIT 1`,
      [nameVi]
    );
    if (found.rows.length > 0) {
      return found.rows[0];
    }

    const baseSlug = slugify(nameVi) || 'danh-muc';
    const slug = await this.resolveUniqueCategorySlug(client, baseSlug);

    const inserted = await client.query<{ id: string; slug: string }>(
      `INSERT INTO categories (name_vi, name_en, slug, level, display_order, is_active)
       VALUES ($1, $1, $2, 0, 0, true)
       RETURNING id, slug`,
      [nameVi, slug]
    );

    return inserted.rows[0];
  }

  private async resolveUniqueCategorySlug(client: PoolClient, base: string): Promise<string> {
    const existing = await client.query<{ slug: string }>(
      'SELECT slug FROM categories WHERE slug LIKE $1',
      [`${base}%`]
    );
    const taken = new Set(existing.rows.map((r) => r.slug));
    if (!taken.has(base)) return base;
    for (let i = 2; i < 1000; i++) {
      const candidate = `${base}-${i}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${base}-${Date.now()}`;
  }

  private async resolveUniqueProductSlug(client: PoolClient, base: string): Promise<string> {
    const existing = await client.query<{ slug: string }>(
      'SELECT slug FROM products WHERE slug LIKE $1',
      [`${base}%`]
    );
    const taken = new Set(existing.rows.map((r) => r.slug));
    if (!taken.has(base)) return base;
    for (let i = 2; i < 1000; i++) {
      const candidate = `${base}-${i}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${base}-${Date.now()}`;
  }
}

export const productImportService = new ProductImportService();
