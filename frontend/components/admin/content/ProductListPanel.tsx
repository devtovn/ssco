'use client';

import { useCallback, useEffect, useRef, useState, Fragment } from 'react';
import Link from 'next/link';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';
import type { CategoryTree } from '@kombe/types';

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
  source_type: string | null;
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

interface PriceEntry {
  id: string;
  source_name: string;
  external_id: string | null;
  source_url: string | null;
  affiliate_url: string | null;
  price: number;
  currency: string;
  is_available: boolean;
  scraped_at: string | null;
}

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type StatusFilter = '' | 'true' | 'false';

const LIMIT = 20;

function flattenTree(nodes: CategoryTree[]): Category[] {
  const result: Category[] = [];
  for (const node of nodes) {
    result.push({ id: node.category.id, slug: node.category.slug, name: node.category.name });
    result.push(...flattenTree(node.children));
  }
  return result;
}

function formatPrice(v: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);
}

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(v));
}

function sourceLabel(name: string) {
  return SOURCE_LABELS[name] ?? name;
}

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  if (total > 1) pages.push(total);
  return pages;
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

export function ProductListPanel({ embedded = false }: { embedded?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [priceEntriesCache, setPriceEntriesCache] = useState<Record<string, PriceEntry[]>>({});
  const [loadingEntries, setLoadingEntries] = useState<Set<string>>(new Set());
  const [savingHidden, setSavingHidden] = useState<Record<string, boolean>>({});

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && !allSelected;
  const allCheckRef = useRef<HTMLInputElement>(null);

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (allCheckRef.current) allCheckRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const fetchProducts = useCallback(async (q: string, cat: string, status: StatusFilter, p: number) => {
    setLoading(true);
    setError(null);
    setSelected(new Set());
    setExpandedIds(new Set());
    try {
      const urlParams: Record<string, string | number> = { limit: LIMIT, page: p };
      if (q) urlParams.q = q;
      if (cat) urlParams.category = cat;
      if (status) urlParams.isActive = status;
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
    fetchProducts(search, filterCategory, filterStatus, page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterStatus, page]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(value, filterCategory, filterStatus, 1), 300);
  }

  function handleFilterCategory(value: string) {
    setFilterCategory(value);
    setPage(1);
  }

  function handleFilterStatus(value: StatusFilter) {
    setFilterStatus(value);
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

  async function loadPriceEntries(productId: string) {
    if (priceEntriesCache[productId] || loadingEntries.has(productId)) return;
    setLoadingEntries((prev) => new Set(prev).add(productId));
    try {
      const json = await adminFetch(buildApiUrl(`/admin/products/${productId}/price-entries`));
      setPriceEntriesCache((prev) => ({ ...prev, [productId]: json.data ?? [] }));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Lỗi tải giá sàn');
    } finally {
      setLoadingEntries((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }

  async function toggleExpand(productId: string) {
    const willExpand = !expandedIds.has(productId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    if (willExpand) await loadPriceEntries(productId);
  }

  async function toggleSourceVisibility(product: Product, sourceName: string, visible: boolean) {
    const hidden = new Set(product.hidden_sources ?? []);
    if (visible) hidden.delete(sourceName);
    else hidden.add(sourceName);
    const hiddenSources = [...hidden];

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, hidden_sources: hiddenSources } : p))
    );

    setSavingHidden((prev) => ({ ...prev, [product.id]: true }));
    setActionError(null);
    try {
      await adminFetch(buildApiUrl(`/admin/products/${product.id}`), {
        method: 'PATCH',
        body: JSON.stringify({ hiddenSources }),
      });
    } catch (e) {
      setProducts((prev) =>
        prev.map((row) =>
          row.id === product.id ? { ...row, hidden_sources: product.hidden_sources ?? [] } : row
        )
      );
      setActionError(e instanceof Error ? e.message : 'Lỗi cập nhật sàn');
    } finally {
      setSavingHidden((prev) => ({ ...prev, [product.id]: false }));
    }
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
      if (filterStatus) {
        await fetchProducts(search, filterCategory, filterStatus, page);
      } else {
        setProducts((prev) => prev.filter((p) => !selected.has(p.id)));
        setSelected(new Set());
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Lỗi xóa');
    } finally {
      setSaving(false);
    }
  }

  async function bulkSetActive(isActive: boolean) {
    if (isActive && !window.confirm(`Hiển thị ${selected.size} sản phẩm trên website?`)) return;
    setSaving(true);
    setActionError(null);
    try {
      await adminFetch(buildApiUrl('/admin/products/bulk'), {
        method: 'PATCH',
        body: JSON.stringify({ ids: [...selected], isActive }),
      });
      if (filterStatus) {
        await fetchProducts(search, filterCategory, filterStatus, page);
      } else {
        setProducts((prev) =>
          prev.map((p) => (selected.has(p.id) ? { ...p, is_active: isActive } : p))
        );
        setSelected(new Set());
      }
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
    setActionError(null);
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
      await adminFetch(buildApiUrl(`/admin/products/${editTarget.id}`), {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim(), category: editCategory }),
      });
      const catName = categories.find((c) => c.slug === editCategory)?.name ?? editTarget.category_name;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editTarget.id
            ? { ...p, name: editName.trim(), category_slug: editCategory, category_name: catName }
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

  const colCount = 7;
  const rangeStart = pagination ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const rangeEnd = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Sản phẩm</h1>
          {pagination && (
            <span className="text-sm text-slate-500">{pagination.total} sản phẩm</span>
          )}
        </div>
      )}
      {embedded && pagination && (
        <p className="text-sm text-slate-500">{pagination.total} sản phẩm</p>
      )}

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
        <select
          value={filterStatus}
          onChange={(e) => handleFilterStatus(e.target.value as StatusFilter)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">Trạng thái: Tất cả</option>
          <option value="true">Hiển thị</option>
          <option value="false">Ẩn</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
                <th className="w-10 px-2 py-3" aria-label="Mở rộng" />
                <th className="px-4 py-3 font-semibold text-slate-600">Sản phẩm</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Danh mục</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Sàn</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Trạng thái</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: colCount }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-4 py-10 text-center text-slate-400">
                    Không tìm thấy sản phẩm nào
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isSelected = selected.has(p.id);
                  const isExpanded = expandedIds.has(p.id);
                  const entries = priceEntriesCache[p.id];
                  const entriesLoading = loadingEntries.has(p.id);
                  const isSavingSources = savingHidden[p.id];

                  return (
                    <Fragment key={p.id}>
                      <tr
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
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </button>
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
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={colCount} className="px-4 py-3">
                            {entriesLoading ? (
                              <p className="py-2 text-center text-xs text-slate-400">Đang tải giá sàn…</p>
                            ) : !entries?.length ? (
                              <p className="py-2 text-center text-xs text-slate-400">Chưa có dữ liệu giá</p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                                  <span className="text-xs font-medium text-slate-600">
                                    Giá theo sàn ({entries.length})
                                  </span>
                                  {isSavingSources && (
                                    <span className="text-xs text-primary-600">Đang lưu…</span>
                                  )}
                                </div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-left text-slate-500">
                                      <th className="px-4 py-2 font-medium">Sàn</th>
                                      <th className="px-4 py-2 font-medium">SKU</th>
                                      <th className="px-4 py-2 font-medium text-right">Giá</th>
                                      <th className="px-4 py-2 font-medium">Cập nhật</th>
                                      <th className="px-4 py-2 font-medium text-center">Hiển thị sàn</th>
                                      <th className="px-4 py-2 font-medium text-right">Link</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {entries.map((entry) => {
                                      const visible = !(p.hidden_sources ?? []).includes(entry.source_name);
                                      return (
                                        <tr key={entry.id} className={!entry.is_available ? 'opacity-50' : undefined}>
                                          <td className="px-4 py-2 font-medium text-slate-700">
                                            {sourceLabel(entry.source_name)}
                                          </td>
                                          <td className="px-4 py-2 font-mono text-slate-500">
                                            {entry.external_id ?? '—'}
                                          </td>
                                          <td className="px-4 py-2 text-right font-medium text-slate-800">
                                            {formatPrice(Number(entry.price))}
                                          </td>
                                          <td className="px-4 py-2 text-slate-500">
                                            {formatDate(entry.scraped_at)}
                                          </td>
                                          <td className="px-4 py-2 text-center">
                                            <label className="inline-flex cursor-pointer items-center gap-2">
                                              <input
                                                type="checkbox"
                                                checked={visible}
                                                disabled={!entry.is_available || isSavingSources}
                                                onChange={(e) =>
                                                  toggleSourceVisibility(p, entry.source_name, e.target.checked)
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                                              />
                                              <span className={visible ? 'text-slate-700' : 'text-slate-400 line-through'}>
                                                {visible ? 'Bật' : 'Tắt'}
                                              </span>
                                            </label>
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            {entry.source_url ? (
                                              <a
                                                href={entry.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                                              >
                                                Mở link gốc
                                                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                                              </a>
                                            ) : (
                                              <span className="text-slate-300">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>
            Hiển thị {rangeStart}–{rangeEnd} trong {pagination.total} sản phẩm
          </span>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                ← Trước
              </button>
              {buildPageNumbers(pagination.page, pagination.totalPages).map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`min-w-[2.25rem] rounded-lg border px-2.5 py-1.5 ${
                      item === pagination.page
                        ? 'border-primary-500 bg-primary-50 font-medium text-primary-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                Sau →
              </button>
            </div>
          )}
        </div>
      )}

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
              <p className="text-xs text-slate-400">
                Bật/tắt sàn hiển thị trong bảng so sánh giá tại hàng mở rộng — thay đổi được lưu tự động.
              </p>

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
