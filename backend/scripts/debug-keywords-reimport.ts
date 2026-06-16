import { productImportService, parseCsvRows, parseTikiKeywords } from '../src/services/ProductImportService';
import { pool } from '../src/config/database';

async function main() {
  const oneRowCsv = `"sku","name","url","price","discount","image","desc","category","keywords"
"118954","Sách IELTS Success Formula Academic Kèm CD","https://tiki.vn/sach-ielts-success-formula-academic-kem-cd-p415822.html?spid=118954","298000.0","149000.0","https://salt.tikicdn.com/ts/tmp/e6/b1/06/92782c2dd5d2e5802e60b6cd241546c1.jpg","desc","Sách -Truyện","""Nhà Sách Tiki"",""Sách tiếng Việt"",""Sách Học Ngoại Ngữ"",""Sách Học Tiếng Anh"",""Luyện thi IELTS"""`;

  const rows = parseCsvRows(oneRowCsv);
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const ki = header.indexOf('keywords');
  const skuI = header.indexOf('sku');

  const sku = rows[1][skuI];
  const rawKw = rows[1][ki];
  const parsed = parseTikiKeywords(rawKw);
  console.log('Before re-import SKU', sku);
  console.log('  expected keywords:', parsed);

  const before = await pool.query(
    `SELECT p.keywords FROM price_entries pe JOIN products p ON p.id = pe.product_id
     WHERE pe.source_name = 'tiki' AND pe.external_id = $1`,
    [sku]
  );
  console.log('  DB before:', before.rows[0]?.keywords);

  const result = await productImportService.importTikiCsv(oneRowCsv);
  console.log('Import result:', result);

  const after = await pool.query(
    `SELECT p.keywords FROM price_entries pe JOIN products p ON p.id = pe.product_id
     WHERE pe.source_name = 'tiki' AND pe.external_id = $1`,
    [sku]
  );
  console.log('  DB after:', after.rows[0]?.keywords);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
