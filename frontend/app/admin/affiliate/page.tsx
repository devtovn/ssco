'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetchWithAuth } from '@/lib/auth';

interface AffiliateConfig {
  platformId: string;
  platformName: string;
  referCode: string;
  linkTemplate: string;
  isEnabled?: boolean;
  priority?: number;
  linkFormat?: {
    type: string;
    parameterName?: string;
    template: string;
    exampleUrl: string;
  };
}

const LINK_FORMAT_TYPES = ['query_param', 'path_param', 'subdomain', 'custom'] as const;

export default function AdminAffiliatePage() {
  const [configs, setConfigs] = useState<AffiliateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newPlatformId, setNewPlatformId] = useState('');
  const [newPlatformName, setNewPlatformName] = useState('');
  const [newReferCode, setNewReferCode] = useState('');
  const [newLinkTemplate, setNewLinkTemplate] = useState('');
  const [newFormatType, setNewFormatType] = useState<string>('query_param');
  const [newFormatTemplate, setNewFormatTemplate] = useState('');
  const [newFormatExampleUrl, setNewFormatExampleUrl] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReferCode, setEditReferCode] = useState('');
  const [editLinkTemplate, setEditLinkTemplate] = useState('');

  async function loadConfigs() {
    setLoading(true);
    try {
      const data = await apiFetchWithAuth<AffiliateConfig[]>('/affiliate/configs');
      setConfigs(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được cấu hình');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfigs();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await apiFetchWithAuth('/affiliate/configs', {
        method: 'POST',
        body: JSON.stringify({
          platformId: newPlatformId,
          platformName: newPlatformName,
          referCode: newReferCode,
          linkTemplate: newLinkTemplate,
          linkFormat: {
            type: newFormatType,
            template: newFormatTemplate,
            exampleUrl: newFormatExampleUrl,
          },
        }),
      });
      setShowCreate(false);
      setNewPlatformId('');
      setNewPlatformName('');
      setNewReferCode('');
      setNewLinkTemplate('');
      setNewFormatType('query_param');
      setNewFormatTemplate('');
      setNewFormatExampleUrl('');
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo cấu hình thất bại');
    }
  }

  function startEdit(config: AffiliateConfig) {
    setEditingId(config.platformId);
    setEditReferCode(config.referCode);
    setEditLinkTemplate(config.linkTemplate);
  }

  async function handleUpdate(platformId: string) {
    try {
      await apiFetchWithAuth(`/affiliate/configs/${platformId}`, {
        method: 'PUT',
        body: JSON.stringify({ referCode: editReferCode, linkTemplate: editLinkTemplate }),
      });
      setEditingId(null);
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    }
  }

  async function handleDelete(platformId: string, platformName: string) {
    if (!confirm(`Xóa cấu hình affiliate "${platformName}"?`)) return;
    try {
      await apiFetchWithAuth(`/affiliate/configs/${platformId}`, { method: 'DELETE' });
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Affiliate</h1>
          <p className="mt-1 text-sm text-slate-600">Cấu hình liên kết tiếp thị theo sàn</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Thêm sàn
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="font-semibold text-slate-900">Thêm cấu hình affiliate</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Platform ID (vd: tiki)"
              value={newPlatformId}
              onChange={(e) => setNewPlatformId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Tên sàn (vd: Tiki)"
              value={newPlatformName}
              onChange={(e) => setNewPlatformName(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Mã giới thiệu"
              value={newReferCode}
              onChange={(e) => setNewReferCode(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Mẫu link (vd: https://tiki.vn/...)"
              value={newLinkTemplate}
              onChange={(e) => setNewLinkTemplate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <p className="mt-4 text-xs font-medium text-slate-700">Định dạng link</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <select
              value={newFormatType}
              onChange={(e) => setNewFormatType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {LINK_FORMAT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Template định dạng"
              value={newFormatTemplate}
              onChange={(e) => setNewFormatTemplate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              type="url"
              placeholder="URL ví dụ (https://...)"
              value={newFormatExampleUrl}
              onChange={(e) => setNewFormatExampleUrl(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-slate-600">Đang tải...</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium">Sàn</th>
                <th className="px-4 py-3 font-medium">Mã giới thiệu</th>
                <th className="px-4 py-3 font-medium">Mẫu link</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.platformId} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{c.platformName}</td>
                  <td className="px-4 py-3">
                    {editingId === c.platformId ? (
                      <input
                        value={editReferCode}
                        onChange={(e) => setEditReferCode(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                    ) : (
                      c.referCode
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                    {editingId === c.platformId ? (
                      <input
                        value={editLinkTemplate}
                        onChange={(e) => setEditLinkTemplate(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                    ) : (
                      c.linkTemplate
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isEnabled !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.isEnabled !== false ? 'Bật' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {editingId === c.platformId ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdate(c.platformId)}
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
                            onClick={() => startEdit(c)}
                            className="text-primary-600 hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.platformId, c.platformName)}
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
              {!configs.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Chưa có cấu hình affiliate
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
