'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetchWithAuth } from '@/lib/auth';

export default function ReviewerOverviewPage() {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetchWithAuth<{ count: number }>('/content/pending')
      .then((data) => setPendingCount(data.count ?? 0))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tổng quan biên tập</h1>
      <p className="mt-1 text-sm text-slate-600">Trạng thái bài viết chờ xử lý</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/reviewer/pending"
          className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm transition hover:shadow-md"
        >
          <p className="text-sm font-medium text-amber-800">Bài chờ duyệt</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">
            {loading ? '…' : pendingCount}
          </p>
        </Link>

        <Link
          href="/reviewer/generate"
          className="rounded-xl border border-primary-200 bg-primary-50 p-6 shadow-sm transition hover:shadow-md"
        >
          <p className="text-sm font-medium text-primary-800">Tạo bài mới</p>
          <p className="mt-2 text-sm text-primary-700">Sinh nội dung bằng AI từ từ khóa</p>
        </Link>
      </div>
    </div>
  );
}
