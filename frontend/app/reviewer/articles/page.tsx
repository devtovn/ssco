'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetchWithAuth } from '@/lib/auth';

interface Article {
  id: string;
  title: string;
  status: string;
  excerpt?: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
  rejected: 'Từ chối',
};

export default function ReviewerArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetchWithAuth<{ articles: Article[] }>('/content/pending')
      .then((data) => setArticles(data.articles ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được bài viết'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Bài viết</h1>
      <p className="mt-1 text-sm text-slate-600">Danh sách bài trong luồng duyệt</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-600">Đang tải...</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {articles.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <Link
                href={`/reviewer/articles/${a.id}`}
                className="font-medium text-slate-900 hover:text-primary-600"
              >
                {a.title}
              </Link>
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {STATUS_LABELS[a.status] ?? a.status}
              </span>
              {a.excerpt && <p className="mt-1 text-sm text-slate-600">{a.excerpt}</p>}
            </li>
          ))}
          {!articles.length && (
            <li className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Chưa có bài viết.{' '}
              <Link href="/reviewer/generate" className="text-primary-600 hover:underline">
                Tạo bài mới
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
