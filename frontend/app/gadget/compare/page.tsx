'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CompareTable } from '@/components/gadget/CompareTable';
import { GadgetPricePanel } from '@/components/gadget/GadgetPricePanel';
import { compareGadgets, searchGadgets, type GadgetDevice } from '@/lib/api/gadget';

const MAX_DEVICES = 4;
const CATEGORY_ICONS: Record<string, string> = { mobile: '📱', tablet: '📲', smartwatch: '⌚' };

function GadgetComparePage() {
  const params = useSearchParams();
  const router = useRouter();

  const [devices, setDevices] = useState<GadgetDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<GadgetDevice[]>([]);
  const [searching, setSearching] = useState(false);

  const slugs = (params.get('slugs') ?? '').split(',').filter(Boolean);

  // Load devices from URL slugs
  useEffect(() => {
    if (!slugs.length) { setLoading(false); return; }
    setLoading(true);
    compareGadgets(slugs)
      .then(setDevices)
      .catch(() => setDevices([]))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('slugs')]);

  // Update URL when devices change
  const updateUrl = useCallback((newSlugs: string[]) => {
    const qs = newSlugs.length ? `?slugs=${newSlugs.join(',')}` : '';
    router.replace(`/gadget/compare${qs}`, { scroll: false });
  }, [router]);

  function removeDevice(slug: string) {
    const next = devices.filter((d) => d.slug !== slug);
    setDevices(next);
    updateUrl(next.map((d) => d.slug));
  }

  function addDevice(device: GadgetDevice) {
    if (devices.find((d) => d.slug === device.slug)) return;
    if (devices.length >= MAX_DEVICES) return;
    const next = [...devices, device];
    setDevices(next);
    updateUrl(next.map((d) => d.slug));
    setSearch('');
    setSearchResults([]);
  }

  // Search devices
  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { devices: res } = await searchGadgets({ q: search, });
        setSearchResults(res.filter((d) => !devices.find((ex) => ex.slug === d.slug)).slice(0, 8));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/gadget" className="text-sm text-primary-600 hover:underline">← Thiết bị</Link>
        <h1 className="text-2xl font-bold text-slate-900">So sánh thiết bị</h1>
      </div>

      {/* Add device bar */}
      {devices.length < MAX_DEVICES && (
        <div className="mb-6 relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên thiết bị để thêm vào so sánh…"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            {searching && <span className="self-center text-xs text-slate-400">Đang tìm…</span>}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
              {searchResults.map((d) => (
                <button
                  key={d.slug}
                  onClick={() => addDevice(d)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                >
                  <span>{CATEGORY_ICONS[d.category] ?? '📱'}</span>
                  <span className="text-slate-500">{d.brandName}</span>
                  <span className="font-medium text-slate-900">{d.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Device count info */}
      <p className="mb-4 text-sm text-slate-500">
        {devices.length} / {MAX_DEVICES} thiết bị — tối đa {MAX_DEVICES}
      </p>

      {loading && <p className="py-12 text-center text-slate-400">Đang tải…</p>}

      {!loading && devices.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <p className="text-slate-500">Tìm và thêm ít nhất 2 thiết bị để so sánh</p>
        </div>
      )}

      {!loading && devices.length === 1 && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Thêm ít nhất 1 thiết bị nữa để bắt đầu so sánh
        </div>
      )}

      {!loading && devices.length >= 2 && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CompareTable devices={devices} onRemove={removeDevice} />
          </div>

          {/* Price panels per device */}
          <div className="mt-10 space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Giá trên các sàn</h2>
            {devices.map((d) => (
              <div key={d.slug}>
                <h3 className="mb-1 text-sm font-semibold text-slate-700">
                  {CATEGORY_ICONS[d.category]} {d.brandName} {d.name}
                </h3>
                <GadgetPricePanel deviceSlug={d.slug} deviceName={d.name} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Wrap with Suspense — required because useSearchParams() opts out of static rendering
export default function GadgetComparePageWrapper() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-400">Đang tải…</div>}>
      <GadgetComparePage />
    </Suspense>
  );
}
