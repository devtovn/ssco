import type { Metadata } from 'next';
import type React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ClockIcon,
  CameraIcon,
  CpuChipIcon,
  CircleStackIcon,
  BoltIcon,
  SignalIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

// CameraIcon, SignalIcon, ShieldCheckIcon used in metaChips
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

  const CATEGORY_LABELS: Record<string, string> = { mobile: 'Điện thoại', tablet: 'Máy tính bảng', smartwatch: 'Đồng hồ thông minh' };

  // Fallback image icon per category
  const DeviceIcon = device.category === 'tablet' ? DeviceTabletIcon
    : device.category === 'smartwatch' ? ClockIcon
    : DevicePhoneMobileIcon;

  // Extract RAM: look for "XGB RAM" pattern inside the internal storage string
  const ramRaw = device.specs.memory?.internal ?? '';
  const ramMatch = ramRaw.match(/(\d+)\s*GB\s*RAM/i);
  const ramValue = ramMatch ? `${ramMatch[1]} GB` : undefined;

  // Key specs — chung cho cả 3 loại
  type SpecCard = { Icon: React.ElementType; label: string; value: string | undefined };
  const keySpecs: SpecCard[] = [
    { Icon: DeviceIcon,      label: 'Màn hình',   value: device.specs.display?.size },
    { Icon: CpuChipIcon,     label: 'Chip',        value: device.specs.platform?.chipset },
    { Icon: CircleStackIcon, label: 'Dung lượng',  value: ramValue ?? device.specs.memory?.internal?.split('/')[0]?.trim() },
    { Icon: BoltIcon,        label: 'Pin',         value: device.specs.battery?.capacity },
  ];

  const visibleSpecs = keySpecs.filter(s => s.value);

  // Theme per category
  const theme = device.category === 'tablet'
    ? { hero: 'bg-gradient-to-br from-green-50 to-slate-50 border-b border-green-100', border: 'border-green-100', icon: 'text-green-500', badge: 'bg-green-100 text-green-700', brand: 'text-green-700' }
    : device.category === 'smartwatch'
    ? { hero: 'bg-gradient-to-br from-purple-50 to-slate-50 border-b border-purple-100', border: 'border-purple-100', icon: 'text-purple-500', badge: 'bg-purple-100 text-purple-700', brand: 'text-purple-700' }
    : { hero: 'bg-gradient-to-br from-primary-50 to-slate-50 border-b border-primary-100', border: 'border-primary-100', icon: 'text-primary-500', badge: 'bg-primary-100 text-primary-700', brand: 'text-primary-600' };

  // Meta chips — chung cho cả 3 loại
  const weightRaw = device.specs.body?.weight ?? '';
  const weightNum = parseFloat(weightRaw);
  const weightFmt = !isNaN(weightNum)
    ? `${Number.isInteger(weightNum) ? weightNum : weightNum.toFixed(1)}g`
    : weightRaw || null;

  const cameraVal = device.specs.main_camera?.megapixels
    ?? device.specs.main_camera?.specs?.split(/[,\n]/)[0]?.trim();

  type MetaChip = { Icon: React.ElementType; text: string };
  const metaChips: MetaChip[] = [
    { Icon: ClockIcon,              text: device.announced || '' },
    { Icon: CpuChipIcon,            text: device.specs.platform?.os?.split(',')[0] || '' },
    { Icon: SignalIcon,             text: device.specs.display?.refresh_rate || '' },
    { Icon: CameraIcon,             text: cameraVal || '' },
    { Icon: ShieldCheckIcon,        text: weightFmt || '' },
  ].filter(c => c.text);

  const shareUrl = `${SITE_URL}/gadget/${params.brand}/${params.device}`;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl">

        {/* ── Hero band ─────────────────────────────────────────── */}
        <div className={`${theme.hero} px-4 py-6 sm:px-8`}>
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
              <div className={`flex h-28 w-24 items-center justify-center rounded-2xl border ${theme.border} bg-white sm:h-36 sm:w-32`}>
                {device.imageUrl ? (
                  <img src={device.imageUrl} alt={device.name} className="h-full w-full object-contain p-3" />
                ) : (
                  <DeviceIcon className="h-16 w-16 text-primary-200" />
                )}
              </div>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${theme.badge}`}>
                <DeviceIcon className="h-3 w-3" />
                {CATEGORY_LABELS[device.category] ?? device.category}
              </span>
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${theme.brand}`}>{device.brandName}</p>
                <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">{device.name}</h1>
              </div>

              {/* Key specs — 4 cards */}
              {visibleSpecs.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {visibleSpecs.map((s) => (
                    <div key={s.label} className={`flex flex-col items-center rounded-xl border ${theme.border} bg-white px-3 py-2.5 text-center`}>
                      <s.Icon className={`h-5 w-5 ${theme.icon}`} />
                      <span className="mt-1.5 text-sm font-bold text-slate-800 line-clamp-1">{s.value}</span>
                      <span className="text-[11px] text-slate-400">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Meta chips */}
              {metaChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {metaChips.map((c, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
                      <c.Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {c.text}
                    </span>
                  ))}
                </div>
              )}

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
