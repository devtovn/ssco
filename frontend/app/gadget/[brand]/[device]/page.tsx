import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { SpecsTable } from '@/components/gadget/SpecsTable';
import { GadgetPricePanel } from '@/components/gadget/GadgetPricePanel';
import { ShareButton } from '@/components/gadget/ShareButton';
import { getGadgetDevice, getGadgetBrands } from '@/lib/api/gadget';
import { getSiteConfig } from '@/lib/api/site-config';

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';

interface Props { params: { brand: string; device: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  try {
    const device = await getGadgetDevice(params.device);
    const title = `${device.name} - Thông số kỹ thuật | ${siteName}`;
    const description = `Xem đầy đủ thông số kỹ thuật ${device.name}. So sánh với các thiết bị khác.`;
    const canonical = `${SITE_URL}/gadget/${params.brand}/${params.device}`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, type: 'website', url: canonical },
    };
  } catch (err) {
    console.error('[DeviceDetailPage] generateMetadata', err);
    return { title: `Thiết bị | ${siteName}` };
  }
}

export default async function DeviceDetailPage({ params }: Props) {
  let device: Awaited<ReturnType<typeof getGadgetDevice>>;
  let brands: Awaited<ReturnType<typeof getGadgetBrands>> = [];
  try {
    [device, brands] = await Promise.all([
      getGadgetDevice(params.device),
      getGadgetBrands(),
    ]);
  } catch {
    notFound();
  }

  const CATEGORY_LABELS: Record<string, string> = { mobile: '📱 Điện thoại', tablet: '📲 Máy tính bảng', smartwatch: '⌚ Đồng hồ' };
  const CATEGORY_ICONS: Record<string, string> = { mobile: '📱', tablet: '📲', smartwatch: '⌚' };

  // Extract RAM: look for "XGB RAM" pattern inside the internal storage string
  const ramRaw = device.specs.memory?.internal ?? '';
  const ramMatch = ramRaw.match(/(\d+)\s*GB\s*RAM/i);
  const ramValue = ramMatch ? `${ramMatch[1]} GB` : undefined;

  const keySpecs = [
    { icon: '📺', label: 'Màn hình', value: device.specs.display?.size },
    { icon: '📷', label: 'Camera',   value: device.specs.main_camera?.megapixels ?? device.specs.main_camera?.specs?.split(/[,\n]/)[0]?.trim() },
    { icon: '🧠', label: 'RAM',      value: ramValue },
    { icon: '🔋', label: 'Pin',      value: device.specs.battery?.capacity },
  ].filter(s => s.value);

  const shareUrl = `${SITE_URL}/gadget/${params.brand}/${params.device}`;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl">

        {/* ── Hero band ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-primary-50 to-slate-50 border-b border-primary-100 px-4 py-6 sm:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-1 text-xs text-slate-400">
            <Link href="/gadget" className="hover:text-primary-600">Thiết bị</Link>
            <span>/</span>
            <Link href={`/gadget/${params.brand}`} className="hover:text-primary-600">
              {device.brandName}
            </Link>
            <span>/</span>
            <span className="text-slate-600">{device.name}</span>
          </nav>

          <div className="flex gap-5 sm:gap-8">
            {/* Image */}
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="flex h-28 w-24 items-center justify-center rounded-2xl border border-primary-100 bg-white sm:h-36 sm:w-32">
                {device.imageUrl ? (
                  <img src={device.imageUrl} alt={device.name} className="h-full w-full object-contain p-3" />
                ) : (
                  <span className="text-5xl">{CATEGORY_ICONS[device.category] ?? '📱'}</span>
                )}
              </div>
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                {CATEGORY_LABELS[device.category] ?? device.category}
              </span>
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">{device.brandName}</p>
                <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">{device.name}</h1>
              </div>

              {/* Key specs — 4 cards */}
              {keySpecs.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {keySpecs.map((s) => (
                    <div key={s.label} className="flex flex-col items-center rounded-xl border border-primary-100 bg-white px-3 py-2.5 text-center">
                      <span className="text-lg leading-none">{s.icon}</span>
                      <span className="mt-1.5 text-sm font-bold text-slate-800 line-clamp-1">{s.value}</span>
                      <span className="text-[11px] text-slate-400">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Meta chips */}
              {(() => {
                // Format weight: "188.00 g" → "188g", "188.50 g" → "188.5g"
                const weightRaw = device.specs.body?.weight ?? '';
                const weightNum = parseFloat(weightRaw);
                const weightFmt = !isNaN(weightNum)
                  ? `${Number.isInteger(weightNum) ? weightNum : weightNum.toFixed(1)}g`
                  : weightRaw || null;

                // Thickness from dimensions
                const dims = device.specs.body?.dimensions ?? '';
                const thickMatch = dims.match(/([\d.]+)\s*mm\s*thick/i);
                const thickFmt = thickMatch ? `${thickMatch[1]}mm` : null;

                const weightLabel = [weightFmt, thickFmt].filter(Boolean).join(' · ');

                const chips = [
                  { icon: '📅', text: device.announced || null },
                  { icon: '⚖️', text: weightLabel || null },
                  { icon: '💻', text: device.specs.platform?.os?.split(',')[0] ?? null },
                  { icon: '🔄', text: device.specs.display?.refresh_rate ?? null },
                ].filter(c => c.text);

                if (!chips.length) return null;
                return (
                  <div className="flex flex-wrap gap-2">
                    {chips.map((c) => (
                      <span key={c.icon} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
                        <span>{c.icon}</span>
                        {c.text}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/gadget/compare?slugs=${device.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
                >
                  So sánh
                </Link>
                {device.productSlug && (
                  <Link
                    href={`/san-pham/${device.productSlug}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    Xem giá
                  </Link>
                )}
                <ShareButton title={device.name} url={shareUrl} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-8">
          {/* Prices */}
          <GadgetPricePanel deviceSlug={device.slug} deviceName={device.name} />

          {/* Mobile: brand pill scroll */}
          <div className="mt-10 md:hidden">
            <p className="mb-2 text-xs font-semibold text-slate-500">Hãng sản xuất</p>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {brands.map((b) => {
                const isActive = b.slug === params.brand;
                return (
                  <Link
                    key={b.id}
                    href={`/gadget/${b.slug}`}
                    className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
                      isActive
                        ? 'border-primary-400 bg-primary-50 font-semibold text-primary-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {b.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop: sidebar + specs side by side */}
          <div className="mt-4 flex overflow-hidden rounded-lg border border-slate-200 bg-white md:mt-10">
            {/* Left sidebar: brands — 3/12, desktop only */}
            <aside className="hidden w-3/12 shrink-0 border-r border-slate-200 bg-slate-50 md:flex md:flex-col">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                Hãng sản xuất
              </div>
              <ul>
                {brands.map((b) => {
                  const isActive = b.slug === params.brand;
                  return (
                    <li key={b.id}>
                      <Link
                        href={`/gadget/${b.slug}`}
                        className={`block border-b border-slate-100 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-primary-50 font-bold text-primary-700 border-l-4 border-l-primary-600'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {b.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* Right: specs table */}
            <div className="flex w-full flex-col md:w-9/12">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                Thông số kỹ thuật đầy đủ
              </div>
              <SpecsTable specs={device.specs} />
            </div>
          </div>

          {device.gsmarenaUrl && (
            <p className="mt-6 text-xs text-slate-400">
              Nguồn: <a href={device.gsmarenaUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">GSMArena</a>
            </p>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
