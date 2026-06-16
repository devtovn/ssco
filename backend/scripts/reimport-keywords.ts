#!/usr/bin/env npx tsx
/**
 * Re-import products.keywords from Tiki CSV, matched by SKU (price_entries.external_id).
 * Usage: npx tsx scripts/reimport-keywords.ts [path-to-csv]
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { pool } from '../src/config/database';
import { parseCsvRows, parseTikiKeywords } from '../src/services/ProductImportService';

const BATCH = 500;
const CSV_PATH =
  process.argv[2] ?? resolve(__dirname, '../../data/tiki.vn (full).csv');

interface SkuKeywords {
  sku: string;
  keywords: string[];
}

function loadSkuKeywords(csvPath: string): SkuKeywords[] {
  const parsed = parseCsvRows(readFileSync(csvPath, 'utf-8').trim());
  const header = parsed[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const skuIdx = header.indexOf('sku');
  const kwIdx = header.indexOf('keywords');
  if (skuIdx < 0 || kwIdx < 0) {
    throw new Error('CSV thiếu cột sku hoặc keywords');
  }

  const out: SkuKeywords[] = [];
  for (let i = 1; i < parsed.length; i++) {
    const cells = parsed[i];
    const sku = (cells[skuIdx] ?? '').trim().replace(/^"|"$/g, '');
    if (!sku) continue;
    const keywords = parseTikiKeywords((cells[kwIdx] ?? '').trim());
    out.push({ sku, keywords });
  }
  return out;
}

async function updateBatch(batch: SkuKeywords[]): Promise<{ updated: number; missing: number }> {
  const payload = JSON.stringify(batch.map((r) => ({ sku: r.sku, keywords: r.keywords })));

  const result = await pool.query<{ external_id: string }>(
    `UPDATE products p
     SET keywords = ARRAY(SELECT jsonb_array_elements_text(v.keywords)),
         updated_at = NOW()
     FROM price_entries pe,
          jsonb_to_recordset($1::jsonb) AS v(sku text, keywords jsonb)
     WHERE pe.source_name = 'tiki'
       AND pe.external_id = v.sku
       AND p.id = pe.product_id
     RETURNING pe.external_id`,
    [payload]
  );

  return { updated: result.rowCount ?? 0, missing: batch.length - (result.rowCount ?? 0) };
}

async function main() {
  console.log(`Reading ${CSV_PATH}...`);
  const rows = loadSkuKeywords(CSV_PATH);
  console.log(`Parsed ${rows.length} SKU → keywords mappings`);

  await pool.query(`SET statement_timeout = 0`);

  let updated = 0;
  let missing = 0;

  const started = Date.now();
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const r = await updateBatch(batch);
    updated += r.updated;
    missing += r.missing;
    if ((i + BATCH) % 5000 === 0 || i + BATCH >= rows.length) {
      console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length} — updated ${updated}, missing ${missing}`);
    }
  }

  const broken = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM price_entries pe
     JOIN products p ON p.id = pe.product_id
     WHERE pe.source_name = 'tiki' AND p.keywords[1] = ','`
  );

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);
  console.log(`Updated: ${updated}`);
  console.log(`SKU not found in DB: ${missing}`);
  console.log(`Still broken (keywords[1]=','): ${broken.rows[0].n}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
