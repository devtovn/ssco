import { parseCsvRows, parseTikiKeywords } from '../src/services/ProductImportService';
import { pool } from '../src/config/database';

async function main() {
  const oneRowCsv = `"sku","name","url","price","discount","image","desc","category","keywords"
"118954","Sách IELTS Success Formula Academic Kèm CD","https://tiki.vn/sach-ielts-success-formula-academic-kem-cd-p415822.html?spid=118954","298000.0","149000.0","https://salt.tikicdn.com/ts/tmp/e6/b1/06/92782c2dd5d2e5802e60b6cd241546c1.jpg","desc","Sách -Truyện","""Nhà Sách Tiki"",""Sách tiếng Việt"",""Sách Học Ngoại Ngữ"",""Sách Học Tiếng Anh"",""Luyện thi IELTS"""`;

  const rows = parseCsvRows(oneRowCsv);
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const ki = header.indexOf('keywords');
  const keywords = parseTikiKeywords(rows[1][ki]);
  const name = rows[1][header.indexOf('name')];
  const image = rows[1][header.indexOf('image')];

  const product = await pool.query(
    `SELECT p.id, p.category FROM price_entries pe JOIN products p ON p.id = pe.product_id WHERE pe.external_id = '118954'`
  );
  const productId = product.rows[0].id;
  const category = product.rows[0].category;

  await pool.query(
    `UPDATE products SET
       name = $1,
       description = $2,
       images = $3,
       category = $4,
       keywords = $5,
       updated_at = NOW()
     WHERE id = $6`,
    [name, 'desc', image ? [image] : null, category, keywords, productId]
  );

  const after = await pool.query(`SELECT keywords FROM products WHERE id = $1`, [productId]);
  console.log('after full update:', after.rows[0].keywords);

  await pool.end();
}

main();
