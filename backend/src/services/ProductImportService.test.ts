import { describe, it, expect } from '@jest/globals';
import { parseCsvRows, parseTikiCategoryRoot } from './ProductImportService';

describe('ProductImportService helpers', () => {
  describe('parseCsvRows', () => {
    it('parses quoted fields with commas', () => {
      const csv = `"sku","name","url","price","discount","image","desc","category"
"118954","Sách A, B","https://tiki.vn/p.html","298000.0","149000.0","https://img.jpg","desc here","Cat &gt; Sub"`;
      const rows = parseCsvRows(csv);
      expect(rows).toHaveLength(2);
      expect(rows[1][1]).toBe('Sách A, B');
      expect(rows[1][7]).toBe('Cat &gt; Sub');
    });
  });

  describe('parseTikiCategoryRoot', () => {
    it('returns first segment after decoding &gt;', () => {
      expect(
        parseTikiCategoryRoot(
          'Nhà Sách Tiki &gt; Sách tiếng Việt &gt; Sách Học Ngoại Ngữ'
        )
      ).toBe('Nhà Sách Tiki');
    });

    it('handles plain > separator', () => {
      expect(parseTikiCategoryRoot('Điện Gia Dụng > Đồ dùng nhà bếp')).toBe('Điện Gia Dụng');
    });
  });
});
