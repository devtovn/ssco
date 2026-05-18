'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetchWithAuth } from '@/lib/auth';

type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';

interface Article {
  id: string;
  title: string;
  status: ArticleStatus;
  excerpt?: string;
  createdAt?: string;
}

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
  rejected: 'Từ chối',
};

export default function ReviewerPendingPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function loadPending() {
    setLoading(true);
    try {
      const data = await apiFetchWithAuth<{ articles: Article[] }>('/content/pending');
      setArticles(data.articles ?? []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
  }, []);

  async function handleApprove(id: string) {
    try {
      await apiFetchWithAuth(`/content/${id}/approve`, { method: 'POST' });
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyệt thất bại');
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await apiFetchWithAuth(`/content/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectId(null);
      setRejectReason('');
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Từ chối thất bại');
    }
  }

  async function handlePublish(id: string) {
    try {
      await apiFetchWithAuth(`/content/${id}/publish`, { method: 'POST' });
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xuất bản thất bại');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Bài chờ duyệt</h1>
      <p className="mt-1 text-sm text-slate-600">Duyệt, từ chối hoặc xuất bản bài viết</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-600">Đang tải...</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {articles.map((article) => (
            <li
              key={article.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/reviewer/articles/${article.id}`}
                    className="font-semibold text-slate-900 hover:text-primary-600"
                  >
                    {article.title}
                  </Link>
                  {article.excerpt && (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{article.excerpt}</p>
                  )}
                  <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {STATUS_LABELS[article.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {article.status === 'pending_review' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(article.id)}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectId(article.id)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        Từ chối
                      </button>
                    </>
                  )}
                  {article.status === 'approved' && (
                    <button
                      type="button"
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
                      type="button"
                      onClick={() => handleReject(article.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                    >
                      Xác nhận từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectId(null);
                        setRejectReason('');
                      }}
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
              Không có bài chờ duyệt
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
