import { pool } from '../src/config/database';
import { parseTikiKeywords } from '../src/services/ProductImportService';

async function main() {
  const raw =
    '"Nhà Sách Tiki","Sách tiếng Việt","Sách Học Ngoại Ngữ","Sách Học Tiếng Anh","Luyện thi IELTS"';
  const keywords = parseTikiKeywords(raw);

  console.log('parsed array:', keywords);

  const r1 = await pool.query(`SELECT $1::text[] AS arr`, [keywords]);
  console.log('insert array param:', r1.rows[0].arr);

  const r2 = await pool.query(`SELECT $1::text[] AS arr`, [raw]);
  console.log('insert raw string param:', r2.rows[0].arr);

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
