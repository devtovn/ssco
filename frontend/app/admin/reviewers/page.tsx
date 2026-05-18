'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetchWithAuth } from '@/lib/auth';

interface Reviewer {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export default function AdminReviewersPage() {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editActive, setEditActive] = useState(true);

  async function loadReviewers() {
    setLoading(true);
    try {
      const data = await apiFetchWithAuth<Reviewer[]>('/admin/reviewers');
      setReviewers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviewers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await apiFetchWithAuth('/admin/reviewers', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setEmail('');
      setPassword('');
      await loadReviewers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo tài khoản thất bại');
    }
  }

  async function handleUpdate(id: string) {
    try {
      await apiFetchWithAuth(`/admin/reviewers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ email: editEmail, isActive: editActive }),
      });
      setEditingId(null);
      await loadReviewers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa biên tập viên này?')) return;
    try {
      await apiFetchWithAuth(`/admin/reviewers/${id}`, { method: 'DELETE' });
      await loadReviewers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  function startEdit(reviewer: Reviewer) {
    setEditingId(reviewer.id);
    setEditEmail(reviewer.email);
    setEditActive(reviewer.isActive);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Biên tập viên</h1>
      <p className="mt-1 text-sm text-slate-600">Quản lý tài khoản Reviewer</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="font-semibold text-slate-900">Thêm biên tập viên</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Mật khẩu (tối thiểu 8 ký tự)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Thêm
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-slate-600">Đang tải...</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-700">Email</th>
                <th className="px-4 py-3 font-medium text-slate-700">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reviewers.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    {editingId === r.id ? (
                      <input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1"
                      />
                    ) : (
                      r.email
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === r.id ? (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        Hoạt động
                      </label>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.isActive ? 'Hoạt động' : 'Tắt'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {editingId === r.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdate(r.id)}
                            className="text-primary-600 hover:underline"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-slate-600 hover:underline"
                          >
                            Hủy
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            className="text-primary-600 hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="text-red-600 hover:underline"
                          >
                            Xóa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!reviewers.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                    Chưa có biên tập viên
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
