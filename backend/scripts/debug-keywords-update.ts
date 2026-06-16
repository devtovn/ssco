import { parseCsvRows, parseTikiKeywords } from '../src/services/ProductImportService';
import { pool } from '../src/config/database';

async function main() {
  const oneRowCsv = `"sku","name","url","price","discount","image","desc","category","keywords"
"118954","Sách IELTS Success Formula Academic Kèm CD","https://tiki.vn/sach-ielts-success-formula-academic-kem-cd-p415822.html?spid=118954","298000.0","149000.0","https://salt.tikicdn.com/ts/tmp/e6/b1/06/92782c2dd5d2e5802e60b6cd241546c1.jpg","desc","Sách -Truyện","""Nhà Sách Tiki"",""Sách tiếng Việt"",""Sách Học Ngoại Ngữ"",""Sách Học Tiếng Anh"",""Luyện thi IELTS"""`;

  const rows = parseCsvRows(oneRowCsv);
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const ki = header.indexOf('keywords');
  const keywords = parseTikiKeywords(rows[1][ki]);

  console.log('keywords param:', keywords, Array.isArray(keywords));

  const product = await pool.query(
    `SELECT p.id FROM price_entries pe JOIN products p ON p.id = pe.product_id WHERE pe.external_id = '118954'`
  );
  const productId = product.rows[0].id;

  await pool.query(
    `UPDATE products SET keywords = $1 WHERE id = $2`,
    [keywords, productId]
  );

  const after = await pool.query(`SELECT keywords FROM products WHERE id = $1`, [productId]);
  console.log('after direct update:', after.rows[0].keywords);

  await pool.end();
}

main();
