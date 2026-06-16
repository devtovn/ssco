import { parseCsvRows, parseTikiKeywords } from '../src/services/ProductImportService';

const oneRowCsv = `"sku","name","url","price","discount","image","desc","category","keywords"
"118954","Sách IELTS Success Formula Academic Kèm CD","https://tiki.vn/sach-ielts-success-formula-academic-kem-cd-p415822.html?spid=118954","298000.0","149000.0","https://salt.tikicdn.com/ts/tmp/e6/b1/06/92782c2dd5d2e5802e60b6cd241546c1.jpg","desc","Sách -Truyện","""Nhà Sách Tiki"",""Sách tiếng Việt"",""Sách Học Ngoại Ngữ"",""Sách Học Tiếng Anh"",""Luyện thi IELTS"""`;

const parsed = parseCsvRows(oneRowCsv.trim());
const header = parsed[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
const colIndex = Object.fromEntries(header.map((h, i) => [h, i])) as Record<string, number>;
const cells = parsed[1];
const get = (key: string) => (cells[colIndex[key]] ?? '').trim().replace(/^"|"$/g, '');

const rawFromGet = get('keywords');
const parsedKw = parseTikiKeywords(rawFromGet);

console.log('cell from parseCsvRows:', JSON.stringify(cells[colIndex.keywords]));
console.log('after get():', JSON.stringify(rawFromGet));
console.log('parseTikiKeywords:', parsedKw);

// what if split on comma only (bug fallback)?
const rawFixed = (cells[colIndex.keywords] ?? '').trim();
const parsedFixed = parseTikiKeywords(rawFixed);

console.log('FIXED path:', parsedFixed);
