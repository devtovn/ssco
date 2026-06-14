'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetchWithAuth } from '@/lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

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
  domainPatterns?: string[];
  isCustom?: boolean;
}

interface AffiliateConfig {
  id: string;
  platformId: string;
  platformName?: string;
  provider?: 'native' | 'accesstrade' | 'manual';
  domainPatterns?: string[];
  isEnabled?: boolean;
  credentials?: Record<string, string>;
  referCode?: string;
}

interface AffiliatePublisher {
  id: string;
  provider: string;
  displayName: string;
  appToken?: string;
  isEnabled: boolean;
}

interface AffiliateCampaign {
  id: string;
  affiliateConfigId: string;
  campaignId: string;
  campaignName: string;
  referCode: string;
  isActive: boolean;
  isPrimary: boolean;
}

type ProviderKind = 'native' | 'accesstrade' | 'manual';

// ── Built-in platforms ───────────────────────────────────────────────────────

const BUILTIN_PLATFORMS: PlatformDef[] = [
  {
    id: 'tiki',
    name: 'Tiki',
    logo: '🛍️',
    howToGet: 'Campaign Lazada/Tiki trên accesstrade.vn',
    dashboardUrl: 'https://accesstrade.vn',
    domainPatterns: ['tiki.vn'],
    credentialFields: [
      { key: 'refCode', label: 'Ref Code', placeholder: 'Mã giới thiệu Tiki (native)' },
    ],
  },
  {
    id: 'shopee',
    name: 'Shopee',
    logo: '🧡',
    howToGet: 'Campaign Shopee trên accesstrade.vn',
    dashboardUrl: 'https://accesstrade.vn',
    domainPatterns: ['shopee.vn'],
    credentialFields: [
      { key: 'pubId', label: 'Publisher ID', placeholder: 'Publisher ID Shopee (native)' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Access Token', secret: true },
    ],
  },
  {
    id: 'lazada',
    name: 'Lazada',
    logo: '💙',
    howToGet: 'Campaign Lazada trên accesstrade.vn',
    dashboardUrl: 'https://accesstrade.vn',
    domainPatterns: ['lazada.vn'],
    credentialFields: [
      { key: 'appToken', label: 'App Token', placeholder: 'App Token (native)', secret: true },
      { key: 'campaignId', label: 'Campaign ID', placeholder: 'Campaign ID Lazada (native)' },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    logo: '🎵',
    howToGet: 'Campaign TikTok Shop trên accesstrade.vn',
    dashboardUrl: 'https://accesstrade.vn',
    domainPatterns: ['tiktok.com', 'shop.tiktok.com'],
    credentialFields: [
      { key: 'appKey', label: 'App Key', placeholder: 'App Key TikTok (native)' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Access Token', secret: true },
    ],
  },
];

const PLATFORM_PRESETS: Omit<PlatformDef, 'howToGet' | 'dashboardUrl' | 'credentialFields'>[] = [
  { id: 'cellphones', name: 'CellphoneS', logo: '📱', domainPatterns: ['cellphones.com.vn'] },
  { id: 'fptshop', name: 'FPT Shop', logo: '🏪', domainPatterns: ['fptshop.com.vn'] },
];

function defaultLinkFormat(platformId: string, domainPatterns?: string[]) {
  const host = domainPatterns?.[0] ?? `${platformId.replace(/_/g, '-')}.vn`;
  return {
    type: 'custom' as const,
    template: '{product_url}',
    exampleUrl: `https://${host}/product/example`,
  };
}

function configToPlatform(c: AffiliateConfig): PlatformDef {
  const builtin = BUILTIN_PLATFORMS.find((p) => p.id === c.platformId);
  if (builtin) return { ...builtin, domainPatterns: c.domainPatterns ?? builtin.domainPatterns };
  return {
    id: c.platformId,
    name: c.platformName ?? c.platformId,
    logo: '🛒',
    howToGet: 'Campaign trên accesstrade.vn',
    dashboardUrl: 'https://accesstrade.vn',
    credentialFields: [],
    domainPatterns: c.domainPatterns ?? [`${c.platformId.replace(/_/g, '-')}.vn`],
    isCustom: true,
  };
}

function parseApiError(e: unknown): string {
  if (!(e instanceof Error)) return 'Lỗi không xác định';
  return e.message;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAffiliatePage() {
  const [platformList, setPlatformList] = useState<PlatformDef[]>(BUILTIN_PLATFORMS);
  const [configs, setConfigs] = useState<Record<string, AffiliateConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [publisher, setPublisher] = useState<AffiliatePublisher | null>(null);
  const [atToken, setAtToken] = useState('');
  const [atEnabled, setAtEnabled] = useState(false);
  const [savingPublisher, setSavingPublisher] = useState(false);

  const [providers, setProviders] = useState<Record<string, ProviderKind>>(() =>
    Object.fromEntries(BUILTIN_PLATFORMS.map((p) => [p.id, 'accesstrade' as ProviderKind]))
  );
  const [domainPatterns, setDomainPatterns] = useState<Record<string, string>>({});
  const [campaigns, setCampaigns] = useState<Record<string, AffiliateCampaign[]>>({});
  const [newCampaign, setNewCampaign] = useState<
    Record<string, { campaignId: string; campaignName: string; referCode: string }>
  >({});
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const [creds, setCreds] = useState<Record<string, Record<string, string>>>({});
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  const [showAddForm, setShowAddForm] = useState(false);
  const [addSlug, setAddSlug] = useState('');
  const [addName, setAddName] = useState('');
  const [addDomain, setAddDomain] = useState('');

  const sortedPlatforms = useMemo(
    () => [...platformList].sort((a, b) => {
      const ai = BUILTIN_PLATFORMS.findIndex((p) => p.id === a.id);
      const bi = BUILTIN_PLATFORMS.findIndex((p) => p.id === b.id);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.name.localeCompare(b.name);
    }),
    [platformList]
  );

  async function loadCampaigns(platformId: string) {
    try {
      const data = await apiFetchWithAuth<AffiliateCampaign[]>(
        `/affiliate/configs/${platformId}/campaigns`
      );
      setCampaigns((prev) => ({ ...prev, [platformId]: data }));
    } catch {
      setCampaigns((prev) => ({ ...prev, [platformId]: [] }));
    }
  }

  async function load() {
    setLoading(true);
    try {
      const [data, publishers] = await Promise.all([
        apiFetchWithAuth<AffiliateConfig[]>('/affiliate/configs'),
        apiFetchWithAuth<AffiliatePublisher[]>('/affiliate/publishers?includeToken=true').catch(
          () => []
        ),
      ]);

      const map: Record<string, AffiliateConfig> = {};
      const credMap: Record<string, Record<string, string>> = {};
      const enMap: Record<string, boolean> = {};
      const provMap: Record<string, ProviderKind> = {};
      const domainMap: Record<string, string> = {};

      const merged = [...BUILTIN_PLATFORMS];
      for (const c of data) {
        map[c.platformId] = c;
        credMap[c.platformId] = c.credentials ?? {};
        enMap[c.platformId] = c.isEnabled !== false;
        provMap[c.platformId] = c.provider ?? 'accesstrade';
        domainMap[c.platformId] = (c.domainPatterns ?? []).join(', ');
        if (!merged.some((p) => p.id === c.platformId)) {
          merged.push(configToPlatform(c));
        }
        void loadCampaigns(c.platformId);
      }

      for (const p of BUILTIN_PLATFORMS) {
        if (provMap[p.id] === undefined) provMap[p.id] = 'accesstrade';
        if (domainMap[p.id] === undefined) {
          domainMap[p.id] = (p.domainPatterns ?? []).join(', ');
        }
      }

      setPlatformList(merged);
      setConfigs(map);
      setCreds(credMap);
      setEnabled(enMap);
      setProviders(provMap);
      setDomainPatterns(domainMap);

      const at = publishers.find((p) => p.provider === 'accesstrade') ?? null;
      setPublisher(at);
      setAtToken(at?.appToken ?? '');
      setAtEnabled(at?.isEnabled ?? false);
      setError('');

      if (expandedId === null && merged.length > 0) {
        setExpandedId(merged[0].id);
      }
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(platformId: string, key: string, value: string) {
    setCreds((prev) => ({
      ...prev,
      [platformId]: { ...(prev[platformId] ?? {}), [key]: value },
    }));
  }

  function setCampaignField(platformId: string, key: string, value: string) {
    setNewCampaign((prev) => ({
      ...prev,
      [platformId]: {
        ...(prev[platformId] ?? { campaignId: '', campaignName: '', referCode: '' }),
        [key]: value,
      },
    }));
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function addPlatform(entry: PlatformDef) {
    if (platformList.some((p) => p.id === entry.id)) {
      setExpandedId(entry.id);
      return;
    }
    setPlatformList((prev) => [...prev, entry]);
    setProviders((prev) => ({ ...prev, [entry.id]: 'accesstrade' }));
    setDomainPatterns((prev) => ({
      ...prev,
      [entry.id]: (entry.domainPatterns ?? []).join(', '),
    }));
    setExpandedId(entry.id);
    setShowAddForm(false);
    setAddSlug('');
    setAddName('');
    setAddDomain('');
  }

  function handleAddPreset(preset: (typeof PLATFORM_PRESETS)[number]) {
    addPlatform({
      ...preset,
      howToGet: 'Campaign trên accesstrade.vn',
      dashboardUrl: 'https://accesstrade.vn',
      credentialFields: [],
      isCustom: true,
    });
  }

  function handleAddCustomPlatform() {
    const slug = addSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const name = addName.trim();
    if (!slug || !name) {
      setError('Nhập mã sàn (slug) và tên hiển thị');
      return;
    }
    const patterns = addDomain.trim()
      ? addDomain.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
      : [`${slug.replace(/_/g, '-')}.vn`];
    addPlatform({
      id: slug,
      name,
      logo: '🛒',
      howToGet: 'Campaign trên accesstrade.vn',
      dashboardUrl: 'https://accesstrade.vn',
      credentialFields: [],
      domainPatterns: patterns,
      isCustom: true,
    });
  }

  async function handleSavePublisher() {
    if (!atToken.trim()) {
      setError('Vui lòng nhập AccessTrade App Token');
      return;
    }
    setSavingPublisher(true);
    setError('');
    try {
      await apiFetchWithAuth('/affiliate/publishers/accesstrade', {
        method: 'PUT',
        body: JSON.stringify({ appToken: atToken.trim(), isEnabled: atEnabled }),
      });
      await load();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSavingPublisher(false);
    }
  }

  async function handleAddCampaign(p: PlatformDef) {
    const form = newCampaign[p.id];
    if (!form?.campaignId?.trim() || !form?.campaignName?.trim()) {
      setError('Campaign ID và tên campaign là bắt buộc');
      return;
    }
    if (!configs[p.id]) {
      setError('Lưu cấu hình sàn trước khi thêm campaign');
      return;
    }
    setError('');
    try {
      await apiFetchWithAuth('/affiliate/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          platformId: p.id,
          campaignId: form.campaignId.trim(),
          campaignName: form.campaignName.trim(),
          referCode: form.referCode.trim() || form.campaignId.trim(),
          startDate: new Date().toISOString(),
          isPrimary: (campaigns[p.id]?.length ?? 0) === 0,
        }),
      });
      setNewCampaign((prev) => ({
        ...prev,
        [p.id]: { campaignId: '', campaignName: '', referCode: '' },
      }));
      await loadCampaigns(p.id);
    } catch (e) {
      setError(parseApiError(e));
    }
  }

  async function handleSetPrimary(platformId: string, campaignRowId: string) {
    try {
      await apiFetchWithAuth(`/affiliate/campaigns/${campaignRowId}/set-primary`, {
        method: 'POST',
      });
      await loadCampaigns(platformId);
    } catch (e) {
      setError(parseApiError(e));
    }
  }

  async function handleRegenerate(p: PlatformDef) {
    if (!confirm(`Regenerate affiliate link cho tất cả sản phẩm ${p.name}?`)) return;
    setRegeneratingId(p.id);
    setError('');
    try {
      const result = await apiFetchWithAuth<{ updated: number; errors: string[] }>(
        '/affiliate/regenerate',
        { method: 'POST', body: JSON.stringify({ platformId: p.id }) }
      );
      if (result.errors?.length) {
        setError(`Đã cập nhật ${result.updated} link. Lỗi: ${result.errors.slice(0, 3).join('; ')}`);
      }
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleSave(p: PlatformDef) {
    const platformCreds = creds[p.id] ?? {};
    const provider = providers[p.id] ?? 'accesstrade';
    const patterns = (domainPatterns[p.id] ?? '')
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (provider === 'native') {
      const missing = p.credentialFields.filter((f) => !platformCreds[f.key]?.trim());
      if (missing.length > 0) {
        setError(`Vui lòng điền: ${missing.map((f) => f.label).join(', ')}`);
        return;
      }
    }

    setError('');
    setSavingId(p.id);

    try {
      const isExisting = !!configs[p.id];
      const referCode =
        provider === 'native'
          ? (platformCreds.refCode ?? platformCreds.pubId ?? platformCreds.appKey ?? '')
          : (configs[p.id]?.referCode || `at-${p.id}`);
      const linkFormat = defaultLinkFormat(p.id, patterns.length ? patterns : p.domainPatterns);

      if (isExisting) {
        await apiFetchWithAuth(`/affiliate/configs/${p.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            platformName: p.name,
            provider,
            domainPatterns: patterns.length ? patterns : p.domainPatterns,
            referCode,
            credentials: provider === 'native' ? platformCreds : null,
            isEnabled: enabled[p.id] !== false,
          }),
        });
      } else {
        await apiFetchWithAuth('/affiliate/configs', {
          method: 'POST',
          body: JSON.stringify({
            platformId: p.id,
            platformName: p.name,
            provider,
            domainPatterns: patterns.length ? patterns : p.domainPatterns,
            referCode,
            linkTemplate: linkFormat.exampleUrl,
            linkFormat,
            credentials: provider === 'native' ? platformCreds : null,
            isEnabled: enabled[p.id] !== false,
          }),
        });
      }

      setSavedId(p.id);
      setTimeout(() => setSavedId(null), 2000);
      await load();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggle(p: PlatformDef, e: React.MouseEvent) {
    e.stopPropagation();
    if (!configs[p.id]) return;
    const next = !(enabled[p.id] !== false);
    setEnabled((prev) => ({ ...prev, [p.id]: next }));
    try {
      await apiFetchWithAuth(`/affiliate/configs/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: next }),
      });
    } catch (err) {
      console.error('[handleToggle]', err);
      setEnabled((prev) => ({ ...prev, [p.id]: !next }));
    }
  }

  async function handleDelete(p: PlatformDef, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Xoá cấu hình affiliate ${p.name}?`)) return;
    try {
      await apiFetchWithAuth(`/affiliate/configs/${p.id}`, { method: 'DELETE' });
      if (p.isCustom) {
        setPlatformList((prev) => prev.filter((x) => x.id !== p.id));
      }
      await load();
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Đang tải...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Cấu hình Affiliate</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mặc định dùng AccessTrade cho mọi sàn. Token publisher dùng chung; mỗi sàn có campaign riêng.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* AccessTrade publisher */}
      <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">AccessTrade Publisher</h2>
        <p className="mt-1 text-xs text-slate-600">App Token dùng chung — cấu hình một lần cho tất cả sàn.</p>
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-slate-700">App Token</label>
          <input
            type="password"
            value={atToken}
            onChange={(e) => setAtToken(e.target.value)}
            placeholder="Token từ accesstrade.vn → API"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
            autoComplete="off"
          />
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={atEnabled} onChange={(e) => setAtEnabled(e.target.checked)} />
            Bật AccessTrade publisher
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSavePublisher}
            disabled={savingPublisher}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {savingPublisher ? '…' : publisher?.appToken ? 'Cập nhật token' : 'Lưu token'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedPlatforms.map((p) => {
          const config = configs[p.id];
          const isConfigured = !!config;
          const isOn = enabled[p.id] !== false;
          const isSaving = savingId === p.id;
          const isSaved = savedId === p.id;
          const isExpanded = expandedId === p.id;
          const platformCreds = creds[p.id] ?? {};
          const provider = providers[p.id] ?? 'accesstrade';
          const allFilled =
            provider !== 'native' ||
            p.credentialFields.every((f) => platformCreds[f.key]?.trim());
          const platformCampaigns = campaigns[p.id] ?? [];
          const campForm = newCampaign[p.id] ?? { campaignId: '', campaignName: '', referCode: '' };

          return (
            <div
              key={p.id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
                isExpanded ? 'border-primary-300 ring-1 ring-primary-200' : 'border-slate-200'
              }`}
            >
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => toggleExpand(p.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/80"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-2xl">{p.logo}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{p.name}</h2>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                        {p.id}
                      </span>
                      {isConfigured ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isOn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isOn ? 'Đang bật' : 'Tắt'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Chưa cấu hình
                        </span>
                      )}
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                        {provider === 'accesstrade'
                          ? 'AccessTrade'
                          : provider === 'native'
                            ? 'Native'
                            : 'Manual'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isConfigured && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleToggle(p, e)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          isOn ? 'bg-primary-600' : 'bg-slate-200'
                        }`}
                        aria-label={isOn ? 'Tắt sàn' : 'Bật sàn'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            isOn ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(p, e)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Xoá
                      </button>
                    </>
                  )}
                  <span
                    className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    ▾
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-3">
                  <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span>📌</span>
                    <span>
                      {p.howToGet}{' '}
                      <a
                        href={p.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Mở dashboard ↗
                      </a>
                    </span>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-700">Cách sinh link</label>
                    <select
                      value={provider}
                      onChange={(e) =>
                        setProviders((prev) => ({
                          ...prev,
                          [p.id]: e.target.value as ProviderKind,
                        }))
                      }
                      className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    >
                      <option value="accesstrade">AccessTrade — link_generate (mặc định)</option>
                      <option value="native">Native — API riêng từng sàn</option>
                      <option value="manual">Manual — ghép query param</option>
                    </select>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-700">
                      Domain patterns (phân biệt URL sản phẩm)
                    </label>
                    <input
                      value={domainPatterns[p.id] ?? ''}
                      onChange={(e) =>
                        setDomainPatterns((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      placeholder="vd: cellphones.com.vn, fptshop.com.vn"
                      className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>

                  {provider === 'native' && p.credentialFields.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {p.credentialFields.map((f) => (
                        <div key={f.key}>
                          <label className="block text-xs font-medium text-slate-700">{f.label}</label>
                          <input
                            type={f.secret ? 'password' : 'text'}
                            value={platformCreds[f.key] ?? ''}
                            onChange={(e) => setField(p.id, f.key, e.target.value)}
                            placeholder={f.placeholder}
                            className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
                            autoComplete="off"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {provider === 'accesstrade' && (
                    <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                      Dùng App Token ở trên + Campaign ID bên dưới. Không cần credentials riêng từng sàn.
                    </p>
                  )}

                  {isConfigured && (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-slate-800">Chiến dịch (Campaign)</h3>
                        {platformCampaigns.some((c) => c.isPrimary) && (
                          <button
                            type="button"
                            onClick={() => handleRegenerate(p)}
                            disabled={regeneratingId === p.id}
                            className="text-xs text-primary-600 hover:underline disabled:opacity-40"
                          >
                            {regeneratingId === p.id ? 'Đang regenerate…' : '↻ Regenerate links'}
                          </button>
                        )}
                      </div>
                      {platformCampaigns.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Chưa có campaign — thêm Campaign ID từ AccessTrade.
                        </p>
                      ) : (
                        <ul className="mt-2 space-y-1">
                          {platformCampaigns.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs"
                            >
                              <span>
                                <strong>{c.campaignName}</strong>{' '}
                                <span className="text-slate-400">({c.campaignId})</span>
                                {c.isPrimary && (
                                  <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                                    Primary
                                  </span>
                                )}
                              </span>
                              {!c.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimary(p.id, c.id)}
                                  className="text-primary-600 hover:underline"
                                >
                                  Đặt primary
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <input
                          value={campForm.campaignId}
                          onChange={(e) => setCampaignField(p.id, 'campaignId', e.target.value)}
                          placeholder="Campaign ID (AT)"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <input
                          value={campForm.campaignName}
                          onChange={(e) => setCampaignField(p.id, 'campaignName', e.target.value)}
                          placeholder="Tên campaign"
                          className="rounded border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCampaign(p)}
                          className="rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-900"
                        >
                          + Thêm campaign
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSave(p)}
                      disabled={!allFilled || isSaving}
                      className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
                    >
                      {isSaving ? '…' : isSaved ? '✓ Đã lưu' : isConfigured ? 'Cập nhật' : 'Lưu sàn'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add platform */}
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 hover:border-primary-400 hover:text-primary-700"
          >
            + Thêm sàn
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-700">Thêm nhanh từ preset</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  disabled={platformList.some((x) => x.id === preset.id)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:border-primary-400 disabled:opacity-40"
                >
                  {preset.logo} {preset.name}
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-slate-700">Hoặc sàn tùy chỉnh</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={addSlug}
                onChange={(e) => setAddSlug(e.target.value)}
                placeholder="Mã sàn (slug)"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Tên hiển thị"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
              <input
                value={addDomain}
                onChange={(e) => setAddDomain(e.target.value)}
                placeholder="Domain (vd: cellphones.com.vn)"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleAddCustomPlatform}
                className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                Thêm sàn
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">Luồng hoạt động</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
          <li>Lưu AccessTrade App Token (một lần)</li>
          <li>Mỗi sàn: provider <strong>AccessTrade</strong> (mặc định) + thêm Campaign ID</li>
          <li>Seed sản phẩm → ⚡ Tạo link → lưu vào DB</li>
          <li>Đổi campaign primary → Regenerate links</li>
        </ol>
      </div>
    </div>
  );
}
