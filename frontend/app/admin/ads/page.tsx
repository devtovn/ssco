'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetchWithAuth } from '@/lib/auth';

interface AdZone {
  id: string;
  name: string;
  position: string;
  dimensions: { width: number; height: number; unit: string };
  isActive: boolean;
  createdAt?: string;
}

const POSITIONS = ['header', 'footer', 'sidebar', 'in-content', 'overlay', 'floating'] as const;

export default function AdminAdsPage() {
  const [zones, setZones] = useState<AdZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Create form
  const [name, setName] = useState('');
  const [position, setPosition] = useState<string>('header');
  const [width, setWidth] = useState(728);
  const [height, setHeight] = useState(90);
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWidth, setEditWidth] = useState(728);
  const [editHeight, setEditHeight] = useState(90);
  const [editActive, setEditActive] = useState(true);

  async function loadZones() {
    setLoading(true);
    try {
      const data = await apiFetchWithAuth<AdZone[]>('/ads/zones');
      setZones(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được vùng quảng cáo');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadZones();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await apiFetchWithAuth('/ads/zones', {
        method: 'POST',
        body: JSON.stringify({
          name,
          position,
          dimensions: { width, height, unit: 'px' },
        }),
      });
      setName('');
      await loadZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo vùng quảng cáo thất bại');
    }
  }

  function startEdit(zone: AdZone) {
    setEditingId(zone.id);
    setEditWidth(zone.dimensions.width);
    setEditHeight(zone.dimensions.height);
    setEditActive(zone.isActive);
  }

  async function handleUpdate(id: string) {
    try {
      await apiFetchWithAuth(`/ads/zones/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          dimensions: { width: editWidth, height: editHeight, unit: 'px' },
          isActive: editActive,
        }),
      });
      setEditingId(null);
      await loadZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa vùng quảng cáo này?')) return;
    try {
      await apiFetchWithAuth(`/ads/zones/${id}`, { method: 'DELETE' });
      await loadZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Quảng cáo</h1>
      <p className="mt-1 text-sm text-slate-600">Quản lý vùng hiển thị quảng cáo</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="font-semibold text-slate-900">Tạo vùng quảng cáo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            required
            placeholder="Tên vùng"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Rộng (px)"
          />
          <input
            type="number"
            min={1}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Cao (px)"
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Tạo vùng
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-slate-600">Đang tải...</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Vị trí</th>
                <th className="px-4 py-3 font-medium">Kích thước</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{z.name}</td>
                  <td className="px-4 py-3">{z.position}</td>
                  <td className="px-4 py-3">
                    {editingId === z.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={editWidth}
                          onChange={(e) => setEditWidth(Number(e.target.value))}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <span className="text-slate-500">×</span>
                        <input
                          type="number"
                          min={1}
                          value={editHeight}
                          onChange={(e) => setEditHeight(Number(e.target.value))}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <span className="text-xs text-slate-500">px</span>
                      </div>
                    ) : (
                      `${z.dimensions.width}×${z.dimensions.height}${z.dimensions.unit}`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === z.id ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        Bật
                      </label>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          z.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {z.isActive ? 'Bật' : 'Tắt'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {editingId === z.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdate(z.id)}
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
                            onClick={() => startEdit(z)}
                            className="text-primary-600 hover:underline"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(z.id)}
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
              {!zones.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Chưa có vùng quảng cáo
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
