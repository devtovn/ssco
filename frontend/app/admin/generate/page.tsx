'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchWithAuth } from '@/lib/auth';

interface Article {
  id: string;
  title: string;
  status: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical'>('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const article = await apiFetchWithAuth<Article>('/content/generate', {
        method: 'POST',
        body: JSON.stringify({ keyword, tone, includeComparison: true }),
      });
      router.push(`/admin/articles/${article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo bài viết thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tạo bài viết AI</h1>
      <p className="mt-1 text-sm text-slate-600">Nhập từ khóa để sinh bài so sánh sản phẩm</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Từ khóa</label>
          <input
            required
            minLength={2}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="VD: điện thoại samsung giá rẻ"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Giọng văn</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as typeof tone)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="professional">Chuyên nghiệp</option>
            <option value="casual">Thân thiện</option>
            <option value="technical">Kỹ thuật</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {loading ? 'Đang tạo bài...' : 'Tạo bài viết'}
        </button>
      </form>
    </div>
  );
}
