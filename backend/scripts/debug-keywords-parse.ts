import { readFileSync } from 'fs';
import { parseCsvRows, parseTikiKeywords } from '../src/services/ProductImportService';

const csv = readFileSync('../data/tiki.vn (full).csv', 'utf-8');
const rows = parseCsvRows(csv);
const header = rows[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
const ki = header.indexOf('keywords');
const skuI = header.indexOf('sku');

for (let i = 1; i <= 5; i++) {
  const raw = rows[i][ki];
  const sku = rows[i][skuI];
  const parsed = parseTikiKeywords(raw);
  console.log('SKU', sku);
  console.log('  raw:', JSON.stringify(raw));
  console.log('  parsed:', JSON.stringify(parsed));
}
