'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetchWithAuth } from '@/lib/auth';

interface AdZone {
  id: string;
  name: string;
  position: string;
  dimensions: { width: number; height: number; unit: string };
  isActive: boolean;
}

interface Advertisement {
  id: string;
  zoneId: string;
  type: 'google_ads' | 'static_banner' | 'html_embed';
  contentUrl?: string;
  scriptCode?: string;
  clickUrl?: string;
  isActive: boolean;
  startDate: string;
}

const POSITIONS = ['header', 'footer', 'sidebar', 'in-content', 'overlay', 'floating'] as const;
const AD_TYPES = [
  { value: 'static_banner', label: 'Banner (ảnh)' },
  { value: 'html_embed', label: 'HTML / Script nhúng' },
  { value: 'google_ads', label: 'Google Ads' },
] as const;

const TYPE_LABELS: Record<string, string> = {
  static_banner: 'Banner',
  html_embed: 'HTML/Script',
  google_ads: 'Google Ads',
};

export default function AdminAdsPage() {
  const [zones, setZones] = useState<AdZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedZone, setExpandedZone] = useState<string | null>(null);
  const [zoneAds, setZoneAds] = useState<Record<string, Advertisement[]>>({});
  const [adsLoading, setAdsLoading] = useState<string | null>(null);

  // Create zone form
  const [name, setName] = useState('');
  const [position, setPosition] = useState<string>('header');
  const [width, setWidth] = useState(728);
  const [height, setHeight] = useState(90);

  // Edit zone state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWidth, setEditWidth] = useState(728);
  const [editHeight, setEditHeight] = useState(90);
  const [editActive, setEditActive] = useState(true);

  // New ad form state (per zone)
  const [newAdType, setNewAdType] = useState<'static_banner' | 'html_embed' | 'google_ads'>('static_banner');
  const [newContentUrl, setNewContentUrl] = useState('');
  const [newClickUrl, setNewClickUrl] = useState('');
  const [newScriptCode, setNewScriptCode] = useState('');
  const [addingAd, setAddingAd] = useState(false);

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

  async function loadAds(zoneId: string) {
    setAdsLoading(zoneId);
    try {
      const data = await apiFetchWithAuth<Advertisement[]>(`/ads/zones/${zoneId}/advertisements`);
      setZoneAds((prev) => ({ ...prev, [zoneId]: Array.isArray(data) ? data : [] }));
    } catch {
      setZoneAds((prev) => ({ ...prev, [zoneId]: [] }));
    } finally {
      setAdsLoading(null);
    }
  }

  useEffect(() => { loadZones(); }, []);

  async function toggleExpand(zoneId: string) {
    if (expandedZone === zoneId) {
      setExpandedZone(null);
    } else {
      setExpandedZone(zoneId);
      if (!zoneAds[zoneId]) await loadAds(zoneId);
      resetAdForm();
    }
  }

  function resetAdForm() {
    setNewAdType('static_banner');
    setNewContentUrl('');
    setNewClickUrl('');
    setNewScriptCode('');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await apiFetchWithAuth('/ads/zones', {
        method: 'POST',
        body: JSON.stringify({ name, position, dimensions: { width, height, unit: 'px' } }),
      });
      setName('');
      await loadZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo vùng quảng cáo thất bại');
    }
  }

  async function handleUpdate(id: string) {
    try {
      await apiFetchWithAuth(`/ads/zones/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ dimensions: { width: editWidth, height: editHeight, unit: 'px' }, isActive: editActive }),
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
      if (expandedZone === id) setExpandedZone(null);
      await loadZones();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  async function handleAddAd(zoneId: string, e: FormEvent) {
    e.preventDefault();
    setAddingAd(true);
    try {
      await apiFetchWithAuth(`/ads/zones/${zoneId}/advertisements`, {
        method: 'POST',
        body: JSON.stringify({
          type: newAdType,
          contentUrl: newContentUrl || undefined,
          clickUrl: newClickUrl || undefined,
          scriptCode: newScriptCode || undefined,
          startDate: new Date().toISOString(),
        }),
      });
      resetAdForm();
      await loadAds(zoneId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Thêm quảng cáo thất bại');
    } finally {
      setAddingAd(false);
    }
  }

  async function handleToggleAd(ad: Advertisement) {
    try {
      await apiFetchWithAuth(`/ads/advertisements/${ad.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !ad.isActive }),
      });
      await loadAds(ad.zoneId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    }
  }

  async function handleDeleteAd(ad: Advertisement) {
    if (!confirm('Xóa quảng cáo này?')) return;
    try {
      await apiFetchWithAuth(`/ads/advertisements/${ad.id}`, { method: 'DELETE' });
      await loadAds(ad.zoneId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Quảng cáo</h1>
      <p className="mt-1 text-sm text-slate-600">Quản lý vùng và nội dung quảng cáo</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Create zone form */}
      <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Tạo vùng quảng cáo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input required placeholder="Tên vùng" value={name} onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={position} onChange={(e) => setPosition(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input type="number" min={1} value={width} onChange={(e) => setWidth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Rộng (px)" />
          <input type="number" min={1} value={height} onChange={(e) => setHeight(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Cao (px)" />
        </div>
        <button type="submit" className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Tạo vùng
        </button>
      </form>

      {/* Zone list */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-600">Đang tải...</p>
        ) : zones.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">Chưa có vùng quảng cáo</p>
        ) : (
          zones.map((z) => (
            <div key={z.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Zone header row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">{z.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{z.position}</span>
                  {editingId !== z.id && (
                    <span className="ml-2 text-xs text-slate-400">
                      {z.dimensions.width}×{z.dimensions.height}px
                    </span>
                  )}
                </div>

                {editingId === z.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} value={editWidth} onChange={(e) => setEditWidth(Number(e.target.value))}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <span className="text-slate-400">×</span>
                    <input type="number" min={1} value={editHeight} onChange={(e) => setEditHeight(Number(e.target.value))}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-xs" />
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                      Bật
                    </label>
                    <button onClick={() => handleUpdate(z.id)} className="text-xs text-primary-600 hover:underline">Lưu</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:underline">Hủy</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${z.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {z.isActive ? 'Bật' : 'Tắt'}
                    </span>
                    <button onClick={() => toggleExpand(z.id)}
                      className="text-xs font-medium text-primary-600 hover:underline">
                      {expandedZone === z.id ? 'Thu gọn' : 'Quản lý nội dung'}
                    </button>
                    <button onClick={() => { setEditingId(z.id); setEditWidth(z.dimensions.width); setEditHeight(z.dimensions.height); setEditActive(z.isActive); }}
                      className="text-xs text-slate-600 hover:underline">Sửa</button>
                    <button onClick={() => handleDelete(z.id)} className="text-xs text-red-600 hover:underline">Xóa</button>
                  </div>
                )}
              </div>

              {/* Advertisement panel */}
              {expandedZone === z.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">

                  {/* Existing ads */}
                  {adsLoading === z.id ? (
                    <p className="text-xs text-slate-500">Đang tải...</p>
                  ) : (zoneAds[z.id] ?? []).length > 0 ? (
                    <div className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 font-medium text-slate-600">Loại</th>
                            <th className="px-3 py-2 font-medium text-slate-600">Nội dung</th>
                            <th className="px-3 py-2 font-medium text-slate-600">Trạng thái</th>
                            <th className="px-3 py-2 font-medium text-slate-600">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(zoneAds[z.id] ?? []).map((ad) => (
                            <tr key={ad.id} className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 font-medium">{TYPE_LABELS[ad.type] ?? ad.type}</td>
                              <td className="max-w-xs truncate px-3 py-2 text-slate-500">
                                {ad.scriptCode
                                  ? <span className="italic text-slate-400">(script)</span>
                                  : ad.contentUrl || '—'}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${ad.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                  {ad.isActive ? 'Bật' : 'Tắt'}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-2">
                                  <button onClick={() => handleToggleAd(ad)}
                                    className="text-primary-600 hover:underline">
                                    {ad.isActive ? 'Tắt' : 'Bật'}
                                  </button>
                                  <button onClick={() => handleDeleteAd(ad)} className="text-red-600 hover:underline">Xóa</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mb-4 text-xs text-slate-500">Chưa có quảng cáo trong vùng này.</p>
                  )}

                  {/* Add ad form */}
                  <form onSubmit={(e) => handleAddAd(z.id, e)} className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thêm quảng cáo</p>

                    <div className="flex flex-wrap gap-2">
                      {AD_TYPES.map((t) => (
                        <label key={t.value} className="flex cursor-pointer items-center gap-1.5 text-xs">
                          <input type="radio" name={`type-${z.id}`} value={t.value}
                            checked={newAdType === t.value}
                            onChange={() => { setNewAdType(t.value as any); resetAdForm(); setNewAdType(t.value as any); }} />
                          {t.label}
                        </label>
                      ))}
                    </div>

                    {newAdType === 'static_banner' && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input placeholder="URL ảnh banner (https://...)" value={newContentUrl}
                          onChange={(e) => setNewContentUrl(e.target.value)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs" />
                        <input placeholder="URL đích khi click (https://...)" value={newClickUrl}
                          onChange={(e) => setNewClickUrl(e.target.value)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs" />
                      </div>
                    )}

                    {(newAdType === 'html_embed' || newAdType === 'google_ads') && (
                      <textarea
                        placeholder={newAdType === 'google_ads'
                          ? '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX" crossorigin="anonymous"></script>\n<ins class="adsbygoogle" ...'
                          : 'Dán mã HTML / script nhúng vào đây...'}
                        value={newScriptCode}
                        onChange={(e) => setNewScriptCode(e.target.value)}
                        rows={5}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
                      />
                    )}

                    <button type="submit" disabled={addingAd}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                      {addingAd ? 'Đang lưu...' : 'Thêm quảng cáo'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
