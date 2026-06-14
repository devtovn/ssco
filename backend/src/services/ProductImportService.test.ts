import { describe, it, expect } from '@jest/globals';
import {
  parseCsvRows,
  parseTikiCategoryName,
  parseTikiKeywords,
} from './ProductImportService';

describe('ProductImportService helpers', () => {
  describe('parseCsvRows', () => {
    it('parses quoted fields with commas', () => {
      const csv = `"sku","name","url","price","discount","image","desc","category","keywords"
"118954","Sách A, B","https://tiki.vn/p.html","298000.0","149000.0","https://img.jpg","desc here","Sách -Truyện","""Nhà Sách Tiki"",""Sách tiếng Việt"""`;
      const rows = parseCsvRows(csv);
      expect(rows).toHaveLength(2);
      expect(rows[1][1]).toBe('Sách A, B');
      expect(rows[1][7]).toBe('Sách -Truyện');
      expect(rows[1][8]).toBe('"Nhà Sách Tiki","Sách tiếng Việt"');
      expect(parseTikiKeywords(rows[1][8])).toEqual(['Nhà Sách Tiki', 'Sách tiếng Việt']);
    });
  });

  describe('parseTikiCategoryName', () => {
    it('trims and decodes html entities without splitting', () => {
      expect(parseTikiCategoryName('  Sách -Truyện  ')).toBe('Sách -Truyện');
      expect(parseTikiCategoryName('Điện Gia Dụng &gt; Đồ dùng nhà bếp')).toBe(
        'Điện Gia Dụng > Đồ dùng nhà bếp'
      );
    });
  });

  describe('parseTikiKeywords', () => {
    it('parses quoted comma-separated keywords', () => {
      expect(
        parseTikiKeywords(
          '"Nhà Sách Tiki","Sách tiếng Việt","Sách Học Ngoại Ngữ","Luyện thi IELTS"'
        )
      ).toEqual([
        'Nhà Sách Tiki',
        'Sách tiếng Việt',
        'Sách Học Ngoại Ngữ',
        'Luyện thi IELTS',
      ]);
    });

    it('returns empty array for blank cell', () => {
      expect(parseTikiKeywords('')).toEqual([]);
      expect(parseTikiKeywords('   ')).toEqual([]);
    });
  });
});
