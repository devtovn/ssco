'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';
import type { CategoryTree } from '@price-comparison/types';

interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  category_slug: string;
  category_name: string;
  is_active: boolean;
  created_at: string;
  price_count: number;
  min_price: number | null;
  max_price: number | null;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

function flattenTree(nodes: CategoryTree[]): Category[] {
  const result: Category[] = [];
  for (const node of nodes) {
    result.push({ id: node.category.id, slug: node.category.slug, name: node.category.name });
    result.push(...flattenTree(node.children));
  }
  return result;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LIMIT = 20;

function formatPrice(v: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async (q: string, cat: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error('Chưa đăng nhập');
      const urlParams: Record<string, string | number> = { limit: LIMIT, page: p };
      if (q) urlParams.q = q;
      if (cat) urlParams.category = cat;
      const response = await fetch(buildApiUrl('/admin/products', urlParams), {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || json.message || 'Lỗi tải dữ liệu');
      setProducts(json.data ?? []);
      setPagination(json.pagination ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load categories for filter dropdown
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(buildApiUrl('/categories/tree'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => setCategories(flattenTree(json.data ?? [])))
      .catch(() => {});
  }, []);

  // Re-fetch when category or page changes (immediate)
  useEffect(() => {
    fetchProducts(search, category, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, page]);

  // Debounce search input
  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(value, category, 1), 300);
  }

  function handleCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Sản phẩm</h1>
        {pagination && (
          <span className="text-sm text-slate-500">{pagination.total} sản phẩm</span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Tìm theo tên, thương hiệu, model…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-10 w-72 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        <select
          value={category}
          onChange={(e) => handleCategory(e.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id ?? c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 font-semibold text-slate-600">Sản phẩm</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Danh mục</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Giá thấp nhất</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-center">Sàn</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Không tìm thấy sản phẩm nào
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.brand} · {p.model}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                      {p.category_name || p.category_slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatPrice(p.min_price)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                      {p.price_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.is_active ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Trang {pagination.page}/{pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              ← Trước
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
