'use client';

import { useEffect, useState, Suspense, Fragment } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { CompareTable, type CompareMode } from '@/components/gadget/CompareTable';
import { compareGadgets, searchGadgets, type GadgetDevice } from '@/lib/api/gadget';

const CATEGORY_ICONS: Record<string, string> = { mobile: '📱', tablet: '📲', smartwatch: '⌚' };

// Header height ≈ 60px; mode bar ≈ 44px → device names thead at 104px
const HEADER_H = 60;
const MODE_BAR_H = 44;
const NAMES_STICKY_TOP = HEADER_H + MODE_BAR_H; // 104

/* ── Search dropdown ─────────────────────────────────────────────── */
function CompareSearch({
  placeholder,
  label = 'So sánh với',
  onSelect,
}: {
  placeholder: string;
  label?: string;
  onSelect: (d: GadgetDevice) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GadgetDevice[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { devices } = await searchGadgets({ q: query });
        setResults(devices.slice(0, 8));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      {label && (
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </label>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={placeholder}
        className="w-full border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
      />
      {searching && <span className="absolute right-3 top-8 text-xs text-slate-400">...</span>}
      {focused && results.length > 0 && (
        <div className="absolute z-30 mt-0.5 w-full border border-slate-200 bg-white shadow-lg max-h-72 overflow-y-auto">
          {results.map((d) => (
            <button
              key={d.slug}
              onMouseDown={(e) => { e.preventDefault(); onSelect(d); setQuery(''); setResults([]); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 border-b border-slate-50 last:border-0"
            >
              {d.imageUrl ? (
                <img src={d.imageUrl} alt="" className="h-8 w-8 object-contain shrink-0" />
              ) : (
                <span className="text-base shrink-0">{CATEGORY_ICONS[d.category] ?? '📱'}</span>
              )}
              <div className="min-w-0 flex-1">
                <span className="block text-[11px] text-slate-500">{d.brandName}</span>
                <span className="block font-medium text-slate-900 truncate text-xs">{d.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Swap icon ───────────────────────────────────────────────────── */
function SwapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

/* ── Device card (always shows inline replace search) ────────────── */
function DeviceCard({ device, onReplace }: { device: GadgetDevice; onReplace: (d: GadgetDevice) => void }) {
  return (
    <div className="flex-1 p-4 text-center">
      <div className="flex flex-col items-center gap-1">
        {device.imageUrl ? (
          <img src={device.imageUrl} alt={device.name} className="mx-auto h-28 w-28 object-contain" />
        ) : (
          <span className="text-5xl">{CATEGORY_ICONS[device.category] ?? '📱'}</span>
        )}
        <span className="text-xs text-slate-500">{device.brandName}</span>
        <Link
          href={`/gadget/${device.brandSlug ?? device.brandName?.toLowerCase()}/${device.slug}`}
          className="font-bold text-sm text-slate-900 hover:text-primary-600"
        >
          {device.name}
        </Link>
      </div>
      <div className="mt-3">
        <CompareSearch placeholder="Tìm để thay thế..." label="" onSelect={onReplace} />
      </div>
    </div>
  );
}

/* ── Mode toggle ─────────────────────────────────────────────────── */
function ModeToggle({ mode, onChange }: { mode: CompareMode; onChange: (m: CompareMode) => void }) {
  const modes: { key: CompareMode; label: string }[] = [
    { key: 'full',        label: 'Toàn bộ' },
    { key: 'highlight',   label: 'Highlight' },
    { key: 'differences', label: 'Khác nhau' },
  ];

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
            mode === m.key
              ? 'bg-slate-800 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ── Main compare page ───────────────────────────────────────────── */
function GadgetComparePage() {
  const params = useSearchParams();
  const router = useRouter();

  const MAX_SLOTS = 3;
  const [devices, setDevices] = useState<(GadgetDevice | null)[]>([null, null]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CompareMode>('full');

  const slugs = (params.get('slugs') ?? '').split(',').filter(Boolean);

  useEffect(() => {
    if (!slugs.length) { setLoading(false); return; }
    setLoading(true);
    compareGadgets(slugs)
      .then((loaded) => {
        const slots: (GadgetDevice | null)[] = loaded.map((d) => d);
        while (slots.length < 2) slots.push(null);
        setDevices(slots);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('slugs')]);

  function updateUrl(slots: (GadgetDevice | null)[]) {
    const newSlugs = slots.filter(Boolean).map((d) => d!.slug);
    const qs = newSlugs.length ? `?slugs=${newSlugs.join(',')}` : '';
    router.replace(`/gadget/compare${qs}`, { scroll: false });
  }

  function setSlot(index: number, device: GadgetDevice) {
    const next = [...devices];
    next[index] = device;
    setDevices(next);
    updateUrl(next);
  }

  function swapSlots(i: number, j: number) {
    const next = [...devices];
    [next[i], next[j]] = [next[j], next[i]];
    setDevices(next);
    updateUrl(next);
  }

  function addSlot() {
    if (devices.length >= MAX_SLOTS) return;
    setDevices([...devices, null]);
  }

  function removeSlot(index: number) {
    if (devices.length <= 2) return;
    const next = devices.filter((_, i) => i !== index);
    setDevices(next);
    updateUrl(next);
  }

  const activeDevices = devices.filter(Boolean) as GadgetDevice[];
  const canCompare = activeDevices.length >= 2;

  return (
    <PublicLayout>
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/gadget" className="text-sm text-primary-600 hover:underline">← Thiết bị</Link>
        <h1 className="text-2xl font-bold text-slate-900">So sánh thiết bị</h1>
      </div>

      {loading && <p className="py-12 text-center text-slate-400">Đang tải...</p>}

      {!loading && (
        <>
          {/* Search bars row */}
          <div
            className="mb-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4"
            style={{ gridTemplateColumns: `repeat(${devices.length}, 1fr)${devices.length < MAX_SLOTS ? ' auto' : ''}` }}
          >
            {devices.map((_, i) => (
              <CompareSearch
                key={i}
                placeholder={`Tìm thiết bị ${i + 1}...`}
                onSelect={(d) => setSlot(i, d)}
              />
            ))}
            {devices.length < MAX_SLOTS && (
              <button
                onClick={addSlot}
                className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-3 py-2 text-sm text-slate-400 hover:border-primary-400 hover:text-primary-600 transition-colors"
                title="Thêm thiết bị"
              >
                + Thêm
              </button>
            )}
          </div>

          {/* Device cards — NOT sticky, with swap buttons between columns */}
          <div className="mb-0 overflow-hidden rounded-t-lg border border-b-0 border-slate-200 bg-white shadow-sm">
            <div className="relative flex">
              {devices.map((device, i) => (
                <Fragment key={i}>
                  <div className={`flex-1 relative${i < devices.length - 1 ? ' border-r border-slate-200' : ''}`}>
                    {device ? (
                      <>
                        <DeviceCard device={device} onReplace={(d) => setSlot(i, d)} />
                        {devices.length > 2 && (
                          <button
                            onClick={() => removeSlot(i)}
                            className="absolute top-2 right-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 transition"
                            title="Xóa cột"
                          >
                            ✕
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="p-8 text-center text-slate-400">
                        <p className="text-sm mb-3">Chọn thiết bị {i + 1}</p>
                        <CompareSearch
                          placeholder="Tìm thiết bị..."
                          label=""
                          onSelect={(d) => setSlot(i, d)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Swap button between adjacent columns */}
                  {i < devices.length - 1 && (
                    <div
                      className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${((i + 1) / devices.length) * 100}%` }}
                    >
                      <button
                        onClick={() => swapSlots(i, i + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm hover:border-primary-400 hover:text-primary-600 transition"
                        title="Hoán đổi vị trí"
                      >
                        <SwapIcon />
                      </button>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Mode toggle — sticky below site header */}
          {canCompare && (
            <div
              className="sticky z-20 flex items-center border border-slate-200 bg-white/95 px-4 py-2 backdrop-blur-sm"
              style={{ top: HEADER_H }}
            >
              <ModeToggle mode={mode} onChange={setMode} />
            </div>
          )}

          {/* Compare table */}
          {canCompare ? (
            <div className="overflow-hidden rounded-b-lg border border-t-0 border-slate-200 bg-white">
              <CompareTable devices={activeDevices} mode={mode} stickyTop={NAMES_STICKY_TOP} />
            </div>
          ) : activeDevices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="text-slate-500">Tìm và chọn 2 thiết bị để bắt đầu so sánh</p>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Chọn ít nhất 2 thiết bị để bắt đầu so sánh
            </div>
          )}
        </>
      )}
    </div>
    </PublicLayout>
  );
}

export default function GadgetComparePageWrapper() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-400">Đang tải...</div>}>
      <GadgetComparePage />
    </Suspense>
  );
}
