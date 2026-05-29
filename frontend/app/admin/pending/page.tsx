'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetchWithAuth, getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';

interface Article {
  id: string;
  title: string;
  status: ArticleStatus;
  excerpt?: string;
  createdAt?: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  slug: string;
  category_name: string;
  is_active: boolean;
  created_at: string;
  min_price: number | null;
  price_count: number;
}

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
  rejected: 'Từ chối',
};

async function adminFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error('Chưa đăng nhập');
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? json.message ?? 'Lỗi máy chủ');
  return json;
}

// ── Articles tab ──────────────────────────────────────────────────────────────

function ArticlesTab() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetchWithAuth<{ articles: Article[] }>('/content/pending');
      setArticles(data.articles ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(id: string) {
    try {
      await apiFetchWithAuth(`/content/${id}/approve`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyệt thất bại');
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) { setError('Vui lòng nhập lý do từ chối'); return; }
    try {
      await apiFetchWithAuth(`/content/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectId(null);
      setRejectReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Từ chối thất bại');
    }
  }

  async function handlePublish(id: string) {
    try {
      await apiFetchWithAuth(`/content/${id}/publish`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xuất bản thất bại');
    }
  }

  if (loading) return <p className="mt-6 text-sm text-slate-500">Đang tải...</p>;

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <ul className="space-y-4">
        {articles.map((article) => (
          <li key={article.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link
                  href={`/admin/articles/${article.id}`}
                  className="font-semibold text-slate-900 hover:text-primary-600"
                >
                  {article.title}
                </Link>
                {article.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{article.excerpt}</p>
                )}
                <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {STATUS_LABELS[article.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {article.status === 'pending_review' && (
                  <>
                    <button
                      onClick={() => handleApprove(article.id)}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => setRejectId(article.id)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Từ chối
                    </button>
                  </>
                )}
                {article.status === 'approved' && (
                  <button
                    onClick={() => handlePublish(article.id)}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Xuất bản
                  </button>
                )}
              </div>
            </div>

            {rejectId === article.id && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Lý do từ chối (tối thiểu 5 ký tự)"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleReject(article.id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                  >
                    Xác nhận từ chối
                  </button>
                  <button
                    onClick={() => { setRejectId(null); setRejectReason(''); }}
                    className="text-sm text-slate-600 hover:underline"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {!articles.length && (
          <li className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Không có bài viết chờ duyệt
          </li>
        )}
      </ul>
    </div>
  );
}

// ── Products tab ──────────────────────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'inactive' | 'all'>('inactive');

  async function load() {
    setLoading(true);
    try {
      const url = buildApiUrl('/admin/products', { page: 1, limit: 50 });
      const data = await adminFetch(url);
      const rows: Product[] = data.products ?? data.data ?? data ?? [];
      setProducts(filter === 'inactive' ? rows.filter((p) => !p.is_active) : rows);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được sản phẩm');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function toggleActive(id: string, current: boolean) {
    try {
      await adminFetch(buildApiUrl(`/admin/products/${id}`), {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !current }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cập nhật thất bại');
    }
  }

  function formatVND(v: number | null) {
    if (!v) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-4 flex gap-2">
        {(['inactive', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'inactive' ? 'Chưa kích hoạt' : 'Tất cả'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Đang tải...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Sản phẩm</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Danh mục</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Giá thấp nhất</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Nguồn</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.name}</p>
                    {p.brand && <p className="text-xs text-slate-500">{p.brand}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.category_name || '—'}</td>
                  <td className="px-4 py-3 font-medium text-primary-700">{formatVND(p.min_price)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.price_count} nguồn</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {p.is_active ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/san-pham/${p.slug}`}
                        target="_blank"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Xem
                      </Link>
                      <button
                        onClick={() => toggleActive(p.id, p.is_active)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                          p.is_active
                            ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {p.is_active ? 'Ẩn' : 'Kích hoạt'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    {filter === 'inactive'
                      ? 'Không có sản phẩm chờ kích hoạt'
                      : 'Chưa có sản phẩm nào'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'articles' | 'products';

export default function AdminPendingPage() {
  const [tab, setTab] = useState<Tab>('articles');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Chờ duyệt</h1>
        <p className="mt-1 text-sm text-slate-500">Duyệt bài viết và kích hoạt sản phẩm mới</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {([
          { key: 'articles', label: 'Bài viết' },
          { key: 'products', label: 'Sản phẩm' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-5 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'articles' ? <ArticlesTab /> : <ProductsTab />}
    </div>
  );
}
