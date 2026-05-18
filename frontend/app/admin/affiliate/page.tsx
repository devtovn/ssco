'use client';

import { useEffect, useState } from 'react';
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

export default function AdminAffiliatePage() {
  const [configs, setConfigs] = useState<AffiliateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetchWithAuth<AffiliateConfig[]>('/affiliate/configs')
      .then((data) => setConfigs(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được cấu hình'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Affiliate</h1>
      <p className="mt-1 text-sm text-slate-600">Cấu hình liên kết tiếp thị theo sàn</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.platformId} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium">{c.platformName}</td>
                  <td className="px-4 py-3">{c.referCode}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600">{c.linkTemplate}</td>
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
                </tr>
              ))}
              {!configs.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
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
