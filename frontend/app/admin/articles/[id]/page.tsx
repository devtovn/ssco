'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetchWithAuth } from '@/lib/auth';

type ArticleStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected';

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  status: ArticleStatus;
  rejectionReason?: string;
}

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Nháp',
  pending_review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  published: 'Đã xuất bản',
  rejected: 'Từ chối',
};

export default function ArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetchWithAuth<Article>(`/content/${id}`)
      .then((data) => {
        setArticle(data);
        setTitle(data.title);
        setContent(data.content);
        setExcerpt(data.excerpt ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được bài viết'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const updated = await apiFetchWithAuth<Article>(`/content/${id}/edit`, {
        method: 'PUT',
        body: JSON.stringify({ title, content, excerpt }),
      });
      setArticle(updated);
      setMessage('Đã lưu bài viết');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    try {
      const updated = await apiFetchWithAuth<Article>(`/content/${id}/submit`, { method: 'POST' });
      setArticle(updated);
      setMessage('Đã gửi duyệt');
      router.push('/admin/pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gửi duyệt thất bại');
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Đang tải bài viết...</p>;
  }

  if (!article) {
    return (
      <div>
        <p className="text-red-600">{error || 'Không tìm thấy bài viết'}</p>
        <Link href="/admin/articles" className="mt-4 inline-block text-primary-600 hover:underline">
          ← Quay lại
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chỉnh sửa bài viết</h1>
          <span className="mt-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            {STATUS_LABELS[article.status]}
          </span>
        </div>
        <Link href="/admin/pending" className="text-sm text-primary-600 hover:underline">
          Danh sách chờ duyệt
        </Link>
      </div>

      {article.rejectionReason && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Lý do từ chối: {article.rejectionReason}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tiêu đề</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tóm tắt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nội dung</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={16}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Lưu nháp'}
          </button>
          {article.status === 'draft' || article.status === 'rejected' ? (
            <button
              type="button"
              onClick={handleSubmitForReview}
              className="rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              Gửi duyệt
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
