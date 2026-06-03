'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';
import type { CategoryTree } from '@price-comparison/types';

const SOURCE_LABELS: Record<string, string> = {
  tiki: 'Tiki',
  shopee: 'Shopee',
  lazada: 'Lazada',
  tiktok: 'TikTok Shop',
};

interface Product {
  id: string;
  slug: string;
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
  hidden_sources: string[];
  available_sources: string[];
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

async function adminFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error('Chưa đăng nhập');
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error?.message || json.message || 'Lỗi máy chủ');
  return json;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && !allSelected;
  const allCheckRef = useRef<HTMLInputElement>(null);

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editHidden, setEditHidden] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (allCheckRef.current) allCheckRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const fetchProducts = useCallback(async (q: string, cat: string, p: number) => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    try {
      const urlParams: Record<string, string | number> = { limit: LIMIT, page: p };
      if (q) urlParams.q = q;
      if (cat) urlParams.category = cat;
      const json = await adminFetch(buildApiUrl('/admin/products', urlParams));
      setProducts(json.data ?? []);
      setPagination(json.pagination ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(buildApiUrl('/categories/tree'), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => setCategories(flattenTree(json.data ?? [])))
      .catch((err) => { console.error('[AdminProductsPage] load categories', err); });
  }, []);

  useEffect(() => {
    fetchProducts(search, filterCategory, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, page]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(value, filterCategory, 1), 300);
  }

  function handleFilterCategory(value: string) {
    setFilterCategory(value);
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  async function bulkDelete() {
    if (!window.confirm(`Xóa ${selected.size} sản phẩm? Hành động này không thể hoàn tác.`)) return;
    setSaving(true);
    setActionError(null);
    try {
      await adminFetch(buildApiUrl('/admin/products/bulk'), {
        method: 'DELETE',
        body: JSON.stringify({ ids: [...selected] }),
      });
      setProducts((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Lỗi xóa');
    } finally {
      setSaving(false);
    }
  }

  async function bulkSetActive(isActive: boolean) {
    setSaving(true);
    setActionError(null);
    try {
      await adminFetch(buildApiUrl('/admin/products/bulk'), {
        method: 'PATCH',
        body: JSON.stringify({ ids: [...selected], isActive }),
      });
      setProducts((prev) =>
        prev.map((p) => (selected.has(p.id) ? { ...p, is_active: isActive } : p))
      );
      setSelected(new Set());
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    setEditName(p.name);
    setEditCategory(p.category_slug);
    setEditHidden(new Set(p.hidden_sources ?? []));
    setActionError(null);
  }

  function toggleHiddenSource(src: string) {
    setEditHidden((prev) => {
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  }

  function closeEdit() {
    setEditTarget(null);
    setActionError(null);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    setActionError(null);
    try {
      const hiddenSources = [...editHidden];
      await adminFetch(buildApiUrl(`/admin/products/${editTarget.id}`), {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), category: editCategory, hiddenSources }),
      });
      const catName = categories.find((c) => c.slug === editCategory)?.name ?? editTarget.category_name;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editTarget.id
            ? { ...p, name: editName.trim(), category_slug: editCategory, category_name: catName, hidden_sources: hiddenSources }
            : p
        )
      );
      setEditTarget(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
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
          value={filterCategory}
          onChange={(e) => handleFilterCategory(e.target.value)}
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

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
          <button
            onClick={() => setSelected(new Set())}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600"
          >
            Bỏ chọn
          </button>
          <span className="text-sm font-medium text-primary-800">
            Đã chọn {selected.size} sản phẩm
          </span>
          <div className="ml-auto flex items-center gap-2">
            {actionError && !editTarget && (
              <span className="text-xs text-red-600">{actionError}</span>
            )}
            <button
              onClick={() => bulkSetActive(true)}
              disabled={saving}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Hiển thị
            </button>
            <button
              onClick={() => bulkSetActive(false)}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Ẩn
            </button>
            <button
              onClick={bulkDelete}
              disabled={saving}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="w-10 px-4 py-3">
                  <input
                    ref={allCheckRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600">Sản phẩm</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Danh mục</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Giá thấp nhất</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Sàn</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Trạng thái</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Không tìm thấy sản phẩm nào
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isSelected = selected.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${isSelected ? 'bg-primary-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/san-pham/${p.slug ?? p.id}`}
                          target="_blank"
                          className="font-medium text-slate-800 hover:text-primary-600 line-clamp-1 block transition-colors"
                        >
                          {p.name}
                        </Link>
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
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-primary-300 hover:text-primary-700 transition-colors"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Trang {pagination.page}/{pagination.totalPages}</span>
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

      {/* Edit Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Chỉnh sửa sản phẩm</h2>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{editTarget.name}</p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Tên sản phẩm
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Danh mục
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {categories.map((c) => (
                    <option key={c.id ?? c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source visibility */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-700">Sàn hiển thị trong bảng so sánh giá</p>
                {(editTarget.available_sources ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400">Chưa có sàn nào có dữ liệu giá</p>
                ) : (
                  <div className="grid grid-cols-2 gap-y-2">
                    {(editTarget.available_sources ?? []).map((src) => {
                      const visible = !editHidden.has(src);
                      return (
                        <label key={src} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={() => toggleHiddenSource(src)}
                            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className={`text-sm ${visible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                            {SOURCE_LABELS[src] ?? src}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {actionError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{actionError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editName.trim()}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
