'use client';

import { useEffect, useState } from 'react';
import { apiFetchWithAuth } from '@/lib/auth';

interface PopularProduct {
  productId: string;
  viewCount: number;
  productName?: string;
}

interface SearchTrend {
  query: string;
  searchCount: number;
}

export default function AdminAnalyticsPage() {
  const [products, setProducts] = useState<PopularProduct[]>([]);
  const [trends, setTrends] = useState<SearchTrend[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetchWithAuth<{ products: PopularProduct[] }>('/analytics/popular-products', {
        params: { days, limit: 20 },
      }),
      apiFetchWithAuth<{ trends: SearchTrend[] }>('/analytics/search-trends', {
        params: { days, limit: 20 },
      }),
    ])
      .then(([popular, search]) => {
        setProducts(popular.products ?? []);
        setTrends(search.trends ?? []);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được phân tích'))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phân tích</h1>
          <p className="mt-1 text-sm text-slate-600">Sản phẩm phổ biến và xu hướng tìm kiếm</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value={7}>7 ngày</option>
          <option value={14}>14 ngày</option>
          <option value={30}>30 ngày</option>
        </select>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-600">Đang tải...</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Sản phẩm phổ biến</h2>
            <ul className="mt-4 space-y-2">
              {products.map((p) => (
                <li
                  key={p.productId}
                  className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0"
                >
                  <span>{p.productName || p.productId}</span>
                  <span className="font-medium text-primary-600">{p.viewCount}</span>
                </li>
              ))}
              {!products.length && <li className="text-sm text-slate-500">Chưa có dữ liệu</li>}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Xu hướng tìm kiếm</h2>
            <ul className="mt-4 space-y-2">
              {trends.map((t) => (
                <li
                  key={t.query}
                  className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0"
                >
                  <span>{t.query}</span>
                  <span className="font-medium text-primary-600">{t.searchCount}</span>
                </li>
              ))}
              {!trends.length && <li className="text-sm text-slate-500">Chưa có dữ liệu</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
