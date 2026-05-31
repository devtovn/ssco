'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetchWithAuth } from '@/lib/auth';

interface WebsiteConfig {
  id?: string;
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  metadata?: Record<string, any>;
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<WebsiteConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGadget, setSavingGadget] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const gadgetAutoPublish = config.metadata?.gadget_auto_publish === true;

  useEffect(() => {
    apiFetchWithAuth<WebsiteConfig>('/admin/config')
      .then(setConfig)
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được cấu hình'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const theme = {
        primaryColor: config.theme?.primaryColor || undefined,
        secondaryColor: config.theme?.secondaryColor || undefined,
        fontFamily: config.theme?.fontFamily || undefined,
      };
      const hasTheme = Object.values(theme).some(Boolean);
      const result = await apiFetchWithAuth<{ config: WebsiteConfig }>('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          logoUrl: config.logoUrl || undefined,
          siteName: config.siteName || undefined,
          tagline: config.tagline || undefined,
          theme: hasTheme ? theme : undefined,
        }),
      });
      setConfig(result.config ?? config);
      setMessage('Đã lưu cấu hình');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleGadgetAutoPublish(value: boolean) {
    setSavingGadget(true);
    setError('');
    try {
      const result = await apiFetchWithAuth<{ config: WebsiteConfig }>('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({
          metadata: { ...(config.metadata ?? {}), gadget_auto_publish: value },
        }),
      });
      setConfig(result.config ?? { ...config, metadata: { ...(config.metadata ?? {}), gadget_auto_publish: value } });
      setMessage(value ? 'Bật tự động publish thiết bị' : 'Tắt tự động publish — cần review thủ công');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSavingGadget(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Đang tải cấu hình...</p>;
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cấu hình website</h1>
        <p className="mt-1 text-sm text-slate-600">Thương hiệu và giao diện trang chủ</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}

      {/* ── General config ── */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="font-semibold text-slate-800">Thông tin chung</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tên website</label>
          <input
            value={config.siteName ?? ''}
            onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Khẩu hiệu</label>
          <input
            value={config.tagline ?? ''}
            onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">URL logo</label>
          <input
            type="url"
            value={config.logoUrl ?? ''}
            onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Màu chính</label>
          <input
            type="text"
            placeholder="#0ea5e9"
            value={config.theme?.primaryColor ?? ''}
            onChange={(e) => setConfig({ ...config, theme: { ...config.theme, primaryColor: e.target.value } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Màu phụ</label>
          <input
            type="text"
            placeholder="#0369a1"
            value={config.theme?.secondaryColor ?? ''}
            onChange={(e) => setConfig({ ...config, theme: { ...config.theme, secondaryColor: e.target.value } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </form>

      {/* ── Gadget settings ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-semibold text-slate-800">📱 So sánh Thiết bị</h2>
        <p className="mb-4 text-xs text-slate-500">
          Thiết lập liên quan đến module So sánh Thiết bị (GSMArena).
        </p>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Tự động publish sau khi crawl</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {gadgetAutoPublish
                ? 'Bật — thiết bị được publish ngay sau khi lưu'
                : 'Tắt — thiết bị ở trạng thái Draft, cần vào Admin → Thiết bị để Publish'}
            </p>
          </div>
          <button
            type="button"
            disabled={savingGadget}
            onClick={() => handleGadgetAutoPublish(!gadgetAutoPublish)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              gadgetAutoPublish ? 'bg-primary-600' : 'bg-slate-300'
            } disabled:opacity-40`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                gadgetAutoPublish ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
