'use client';

import { useEffect, useState } from 'react';
import { apiFetchWithAuth } from '@/lib/auth';

// ── Platform credential definitions ──────────────────────────────────────────

interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

interface PlatformDef {
  id: string;
  name: string;
  logo: string;
  howToGet: string;
  dashboardUrl: string;
  credentialFields: CredentialField[];
  /** For Tiki: can auto-generate URL; for others: need API call */
  autoGenerate: boolean;
}

const PLATFORMS: PlatformDef[] = [
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    logo: '🎵',
    howToGet: 'Đăng ký tại affiliate.tiktokshop.com → Open Platform → tạo App → lấy App Key và Access Token',
    dashboardUrl: 'https://affiliate.tiktokshop.com',
    autoGenerate: true,
    credentialFields: [
      { key: 'appKey',      label: 'App Key',      placeholder: 'App Key từ TikTok Open Platform' },
      { key: 'accessToken', label: 'Access Token',  placeholder: 'Access Token', secret: true },
    ],
  },
  {
    id: 'tiki',
    name: 'Tiki',
    logo: '🛍️',
    howToGet: 'Đăng ký tại affiliate.tiki.vn → Dashboard → Mã giới thiệu (Ref Code)',
    dashboardUrl: 'https://affiliate.tiki.vn',
    autoGenerate: true,
    credentialFields: [
      { key: 'refCode', label: 'Ref Code', placeholder: 'Mã giới thiệu từ Tiki Affiliate' },
    ],
  },
  {
    id: 'lazada',
    name: 'Lazada',
    logo: '💙',
    howToGet: 'Đăng ký tại accesstrade.vn → chọn campaign Lazada → lấy App Token và Campaign ID',
    dashboardUrl: 'https://accesstrade.vn',
    autoGenerate: true,
    credentialFields: [
      { key: 'appToken',    label: 'App Token',    placeholder: 'App Token từ AccessTrade', secret: true },
      { key: 'campaignId', label: 'Campaign ID',  placeholder: 'Campaign ID của Lazada' },
    ],
  },
  {
    id: 'shopee',
    name: 'Shopee',
    logo: '🧡',
    howToGet: 'Đăng ký tại affiliate.shopee.vn → Open Platform → Publisher ID và Access Token',
    dashboardUrl: 'https://affiliate.shopee.vn',
    autoGenerate: true,
    credentialFields: [
      { key: 'pubId',       label: 'Publisher ID', placeholder: 'Publisher ID từ Shopee Affiliate' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Access Token', secret: true },
    ],
  },
];

interface AffiliateConfig {
  platformId: string;
  isEnabled?: boolean;
  credentials?: Record<string, string>;
  referCode?: string;
}

export default function AdminAffiliatePage() {
  const [configs, setConfigs]   = useState<Record<string, AffiliateConfig>>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId]   = useState<string | null>(null);

  // Per-platform credential inputs: { [platformId]: { [fieldKey]: value } }
  const [creds, setCreds] = useState<Record<string, Record<string, string>>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetchWithAuth<AffiliateConfig[]>('/affiliate/configs');
      const map: Record<string, AffiliateConfig> = {};
      const credMap: Record<string, Record<string, string>> = {};
      const enMap: Record<string, boolean> = {};
      for (const c of data) {
        map[c.platformId] = c;
        credMap[c.platformId] = c.credentials ?? {};
        enMap[c.platformId] = c.isEnabled !== false;
      }
      setConfigs(map);
      setCreds(credMap);
      setEnabled(enMap);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function setField(platformId: string, key: string, value: string) {
    setCreds(prev => ({
      ...prev,
      [platformId]: { ...(prev[platformId] ?? {}), [key]: value },
    }));
  }

  async function handleSave(p: PlatformDef) {
    const platformCreds = creds[p.id] ?? {};
    // Check all required fields are filled
    const missing = p.credentialFields.filter(f => !platformCreds[f.key]?.trim());
    if (missing.length > 0) {
      setError(`Vui lòng điền: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    setError('');
    setSavingId(p.id);

    try {
      const isExisting = !!configs[p.id];
      const referCode = platformCreds['refCode'] ?? platformCreds['pubId'] ?? platformCreds['appKey'] ?? '';

      // Build a minimal linkFormat so the existing schema validation passes
      const linkFormat = {
        type: 'custom' as const,
        template: `{product_url}`,
        exampleUrl: `https://${p.id}.vn/product/example`,
      };

      const body = {
        platformId: p.id,
        platformName: p.name,
        referCode,
        linkTemplate: linkFormat.exampleUrl,
        linkFormat,
        credentials: platformCreds,
        isEnabled: enabled[p.id] !== false,
      };

      if (isExisting) {
        await apiFetchWithAuth(`/affiliate/configs/${p.id}`, {
          method: 'PUT',
          body: JSON.stringify({ referCode, credentials: platformCreds, isEnabled: enabled[p.id] !== false }),
        });
      } else {
        await apiFetchWithAuth('/affiliate/configs', { method: 'POST', body: JSON.stringify(body) });
      }

      setSavedId(p.id);
      setTimeout(() => setSavedId(null), 2000);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại');
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggle(p: PlatformDef) {
    const next = !(enabled[p.id] !== false);
    setEnabled(prev => ({ ...prev, [p.id]: next }));
    try {
      await apiFetchWithAuth(`/affiliate/configs/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: next }),
      });
    } catch (err) {
      console.error('[handleToggle]', err);
      setEnabled(prev => ({ ...prev, [p.id]: !next }));
    }
  }

  async function handleDelete(p: PlatformDef) {
    if (!confirm(`Xoá cấu hình affiliate ${p.name}?`)) return;
    try {
      await apiFetchWithAuth(`/affiliate/configs/${p.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xoá thất bại');
    }
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Đang tải...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Cấu hình Affiliate</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhập credentials để hệ thống tự động tạo affiliate link khi bạn seed sản phẩm.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="space-y-5">
        {PLATFORMS.map((p) => {
          const config    = configs[p.id];
          const isConfigured = !!config;
          const isOn      = enabled[p.id] !== false;
          const isSaving  = savingId === p.id;
          const isSaved   = savedId === p.id;
          const platformCreds = creds[p.id] ?? {};
          const allFilled = p.credentialFields.every(f => platformCreds[f.key]?.trim());

          return (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.logo}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{p.name}</h2>
                      {isConfigured ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isOn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {isOn ? 'Đang bật' : 'Tắt'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Chưa cấu hình
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isConfigured && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(p)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${isOn ? 'bg-primary-600' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <button type="button" onClick={() => handleDelete(p)} className="text-xs text-red-500 hover:underline">
                      Xoá
                    </button>
                  </div>
                )}
              </div>

              {/* How to get credentials */}
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span>📌</span>
                <span>
                  {p.howToGet}{' '}
                  <a href={p.dashboardUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
                    Mở dashboard ↗
                  </a>
                </span>
              </div>

              {/* Credential fields */}
              <div className="mt-3 space-y-2">
                {p.credentialFields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-700">{f.label}</label>
                    <input
                      type={f.secret ? 'password' : 'text'}
                      value={platformCreds[f.key] ?? ''}
                      onChange={e => setField(p.id, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>

              {/* Save button */}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSave(p)}
                  disabled={!allFilled || isSaving}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
                >
                  {isSaving ? '…' : isSaved ? '✓ Đã lưu' : isConfigured ? 'Cập nhật' : 'Lưu'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="mt-8 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">Luồng hoạt động</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
          <li>Cấu hình credentials cho từng sàn ở trang này</li>
          <li>Khi seed sản phẩm: click <strong>"Tạo affiliate link"</strong> → hệ thống gọi API sàn → lưu link vào DB</li>
          <li>User click "Tới nơi bán" → đọc link đã lưu → redirect ngay, không có API call nào tại thời điểm đó</li>
        </ol>
      </div>
    </div>
  );
}
