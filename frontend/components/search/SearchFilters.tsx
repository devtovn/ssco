'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { SearchResponse, SortBy } from '@price-comparison/types';

interface SearchFiltersProps {
  keyword: string;
  filters?: SearchResponse['filters'];
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'relevance', label: 'Liên quan nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'popularity', label: 'Phổ biến' },
  { value: 'newest', label: 'Mới nhất' },
];

export function SearchFilters({ keyword, filters }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryId = searchParams.get('categoryId') || '';
  const brand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = (searchParams.get('sortBy') as SortBy) || 'relevance';

  const apply = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('q', keyword);
    params.delete('page');

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    router.push(`/search?${params.toString()}`);
  };

  return (
    <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <h2 className="font-semibold text-slate-900">Bộ lọc</h2>

      <div>
        <label htmlFor="sortBy" className="mb-1 block text-sm font-medium text-slate-700">
          Sắp xếp
        </label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) => apply({ sortBy: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filters?.categories && filters.categories.length > 0 && (
        <div>
          <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
            Danh mục
          </label>
          <select
            id="categoryId"
            value={categoryId}
            onChange={(e) => apply({ categoryId: e.target.value || undefined })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            {filters.categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {filters?.brands && filters.brands.length > 0 && (
        <div>
          <label htmlFor="brand" className="mb-1 block text-sm font-medium text-slate-700">
            Thương hiệu
          </label>
          <select
            id="brand"
            value={brand}
            onChange={(e) => apply({ brand: e.target.value || undefined })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Tất cả</option>
            {filters.brands.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name} ({b.count})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <span className="mb-2 block text-sm font-medium text-slate-700">Khoảng giá (VND)</span>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Từ"
            defaultValue={minPrice}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onBlur={(e) => apply({ minPrice: e.target.value || undefined })}
          />
          <input
            type="number"
            placeholder="Đến"
            defaultValue={maxPrice}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            onBlur={(e) => apply({ maxPrice: e.target.value || undefined })}
          />
        </div>
        {filters?.priceRange && (
          <p className="mt-1 text-xs text-slate-500">
            {filters.priceRange.min.toLocaleString('vi-VN')} –{' '}
            {filters.priceRange.max.toLocaleString('vi-VN')} ₫
          </p>
        )}
      </div>
    </aside>
  );
}
