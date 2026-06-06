'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';

interface CacheStats {
  keys: number;
  memory: string;
  hits: string;
  misses: string;
}

interface CacheGroup {
  id: string;
  label: string;
  description: string;
  color: string;
}

const GROUPS: CacheGroup[] = [
  { id: 'all',       label: 'Toàn bộ',    description: 'FLUSHDB — xóa tất cả keys',          color: 'bg-red-600 hover:bg-red-700' },
  { id: 'category',  label: 'Danh mục',   description: 'category:*',                           color: 'bg-orange-500 hover:bg-orange-600' },
  { id: 'product',   label: 'Sản phẩm',   description: 'product:*, deals:*',                   color: 'bg-amber-500 hover:bg-amber-600' },
  { id: 'search',    label: 'Tìm kiếm',   description: 'search:*',                             color: 'bg-yellow-500 hover:bg-yellow-600' },
  { id: 'voucher',   label: 'Voucher',    description: 'voucher:*',                            color: 'bg-lime-500 hover:bg-lime-600' },
  { id: 'ads',       label: 'Quảng cáo',  description: 'ads:*',                               color: 'bg-teal-500 hover:bg-teal-600' },
  { id: 'affiliate', label: 'Affiliate',  description: 'affiliate:*',                          color: 'bg-cyan-500 hover:bg-cyan-600' },
  { id: 'gadget',    label: 'Gadget',     description: 'gadget:*',                            color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'auth',      label: 'Auth/Token', description: 'auth:* (session, refresh token)',      color: 'bg-purple-500 hover:bg-purple-600' },
];

interface LogEntry {
  group: string;
  deleted: number;
  ts: string;
  error?: string;
}

function authHeaders() {
  const token = getToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function CachePage() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [flushing, setFlushing] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [confirmGroup, setConfirmGroup] = useState<CacheGroup | null>(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(buildApiUrl('/admin/cache/stats'), { headers: authHeaders() });
      if (res.ok) {
        setStats(await res.json());
      } else {
        setStats(null);
      }
    } catch {
      setStats(null);
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function flush(group: CacheGroup) {
    setConfirmGroup(null);
    setFlushing(group.id);
    const ts = new Date().toLocaleTimeString('vi-VN');
    try {
      const res = await fetch(buildApiUrl('/admin/cache/flush'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ group: group.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Lỗi server');
      setLog((prev) => [{ group: group.label, deleted: data.deleted, ts }, ...prev.slice(0, 19)]);
      await fetchStats();
    } catch (err: any) {
      setLog((prev) => [{ group: group.label, deleted: 0, ts, error: err.message ?? 'Lỗi' }, ...prev.slice(0, 19)]);
    }
    setFlushing(null);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Cache</h1>
        <p className="mt-1 text-sm text-slate-500">Xóa Redis cache theo nhóm hoặc toàn bộ.</p>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Trạng thái Redis</h2>
          <button
            onClick={fetchStats}
            disabled={loadingStats}
            className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-40"
          >
            {loadingStats ? 'Đang tải…' : '↺ Làm mới'}
          </button>
        </div>
        {loadingStats ? (
          <div className="text-sm text-slate-400">Đang tải…</div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Số keys', value: stats.keys.toLocaleString() },
              { label: 'RAM dùng', value: stats.memory },
              { label: 'Cache hits', value: Number(stats.hits).toLocaleString() },
              { label: 'Cache misses', value: Number(stats.misses).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-lg font-bold text-slate-800">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-red-500">Không lấy được thông tin Redis. Kiểm tra lại kết nối hoặc quyền truy cập.</div>
        )}
      </div>

      {/* Flush buttons */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-700">Xóa cache theo nhóm</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => g.id === 'all' ? setConfirmGroup(g) : flush(g)}
              disabled={flushing !== null}
              className={`flex items-center justify-between rounded-lg px-4 py-3 text-left text-white transition disabled:opacity-50 ${g.color}`}
            >
              <div>
                <div className="font-semibold">{g.label}</div>
                <div className="text-xs opacity-80">{g.description}</div>
              </div>
              {flushing === g.id ? (
                <span className="ml-3 text-xs opacity-80">⏳</span>
              ) : (
                <span className="ml-3 text-lg opacity-70">🗑</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Activity log */}
      {log.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-700">Lịch sử</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-400">
                <th className="pb-2 pr-4">Thời gian</th>
                <th className="pb-2 pr-4">Nhóm</th>
                <th className="pb-2">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-4 text-slate-400">{entry.ts}</td>
                  <td className="py-1.5 pr-4 font-medium text-slate-700">{entry.group}</td>
                  <td className="py-1.5">
                    {entry.error ? (
                      <span className="text-red-500">{entry.error}</span>
                    ) : entry.deleted === -1 ? (
                      <span className="text-orange-600">Đã xóa toàn bộ (FLUSHDB)</span>
                    ) : (
                      <span className="text-slate-600">{entry.deleted} keys</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm dialog — "all" only */}
      {confirmGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-red-600">⚠️ Xóa toàn bộ cache?</h3>
            <p className="mb-5 text-sm text-slate-600">
              Thao tác này gọi <code className="rounded bg-slate-100 px-1">FLUSHDB</code> và xóa
              tất cả {stats ? stats.keys.toLocaleString() : '?'} keys. Không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmGroup(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => flush(confirmGroup)}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Xóa toàn bộ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
