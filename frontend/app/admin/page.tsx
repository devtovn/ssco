'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetchWithAuth } from '@/lib/auth';

interface AnalyticsReport {
  generatedAt: string;
  period: { start: string; end: string; days: number };
  summary: {
    totalPageViews: number;
    totalSearches: number;
    uniqueSessions: number;
  };
  popularProducts: Array<{ productId: string; viewCount: number; productName?: string }>;
  searchTrends: Array<{ query: string; searchCount: number }>;
}

interface SystemPerformance {
  metrics: Array<{ metricName: string; metricValue: number; unit?: string }>;
  errorRate?: number;
  avgResponseTimeMs?: number;
}

function StatCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:shadow-md">
        {content}
      </Link>
    );
  }

  return content;
}

export default function AdminOverviewPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [performance, setPerformance] = useState<SystemPerformance | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetchWithAuth<AnalyticsReport>('/analytics/reports', { params: { days: 7 } }),
      apiFetchWithAuth<SystemPerformance>('/analytics/system-performance'),
    ])
      .then(([reportData, perfData]) => {
        setReport(reportData);
        setPerformance(perfData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Đang tải tổng quan...</p>;
  }

  if (error) {
    return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  }

  const summary = report?.summary;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
      <p className="mt-1 text-sm text-slate-600">Thống kê hệ thống 7 ngày gần nhất</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lượt xem trang" value={summary?.totalPageViews ?? 0} href="/admin/analytics" />
        <StatCard label="Lượt tìm kiếm" value={summary?.totalSearches ?? 0} href="/admin/analytics" />
        <StatCard
          label="Phiên truy cập"
          value={summary?.uniqueSessions ?? 0}
          href="/admin/analytics"
        />
        <StatCard
          label="Thời gian phản hồi TB (ms)"
          value={Math.round(performance?.avgResponseTimeMs ?? 0)}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Sản phẩm phổ biến</h2>
          <ul className="mt-4 space-y-2">
            {(report?.popularProducts ?? []).slice(0, 5).map((p) => (
              <li
                key={p.productId}
                className="flex justify-between text-sm border-b border-slate-100 py-2 last:border-0"
              >
                <span className="text-slate-700">{p.productName || p.productId}</span>
                <span className="font-medium text-primary-600">{p.viewCount} lượt xem</span>
              </li>
            ))}
            {!report?.popularProducts?.length && (
              <li className="text-sm text-slate-500">Chưa có dữ liệu</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Xu hướng tìm kiếm</h2>
          <ul className="mt-4 space-y-2">
            {(report?.searchTrends ?? []).slice(0, 5).map((t) => (
              <li
                key={t.query}
                className="flex justify-between text-sm border-b border-slate-100 py-2 last:border-0"
              >
                <span className="text-slate-700">{t.query}</span>
                <span className="font-medium text-primary-600">{t.searchCount} lần</span>
              </li>
            ))}
            {!report?.searchTrends?.length && (
              <li className="text-sm text-slate-500">Chưa có dữ liệu</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
