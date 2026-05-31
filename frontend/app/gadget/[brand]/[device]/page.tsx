import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { SpecsTable } from '@/components/gadget/SpecsTable';
import { GadgetPricePanel } from '@/components/gadget/GadgetPricePanel';
import { getGadgetDevice } from '@/lib/api/gadget';
import { getSiteConfig } from '@/lib/api/site-config';

interface Props { params: { brand: string; device: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  try {
    const device = await getGadgetDevice(params.device);
    return {
      title: `${device.name} - Thông số kỹ thuật | ${siteName}`,
      description: `Xem đầy đủ thông số kỹ thuật ${device.name}. So sánh với các thiết bị khác.`,
    };
  } catch {
    return { title: `Thiết bị | ${siteName}` };
  }
}

export default async function DeviceDetailPage({ params }: Props) {
  let device: Awaited<ReturnType<typeof getGadgetDevice>>;
  try {
    device = await getGadgetDevice(params.device);
  } catch {
    notFound();
  }

  const CATEGORY_ICONS: Record<string, string> = { mobile: '📱', tablet: '📲', smartwatch: '⌚' };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-sm text-slate-500">
          <Link href="/gadget" className="hover:text-primary-600">Thiết bị</Link>
          <span>/</span>
          <Link href={`/gadget/${params.brand}`} className="hover:text-primary-600 capitalize">
            {device.brandName}
          </Link>
          <span>/</span>
          <span className="text-slate-800">{device.name}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto flex h-56 w-56 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 sm:mx-0">
            {device.imageUrl ? (
              <img src={device.imageUrl} alt={device.name} className="h-full w-full object-contain p-6" />
            ) : (
              <span className="text-7xl">{CATEGORY_ICONS[device.category] ?? '📱'}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-primary-600">{device.brandName}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{device.name}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
              {device.announced && <span>📅 Công bố: {device.announced}</span>}
              {device.status && <span>🟢 {device.status}</span>}
            </div>
            {/* Quick specs summary */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: 'Màn hình', value: device.specs.display?.size },
                { label: 'Chipset', value: device.specs.platform?.chipset },
                { label: 'Camera', value: device.specs.main_camera?.specs?.split(',')[0] },
                { label: 'Pin', value: device.specs.battery?.capacity },
                { label: 'RAM', value: device.specs.memory?.internal?.split(' ')[0] ? device.specs.memory?.internal : undefined },
                { label: 'OS', value: device.specs.platform?.os },
              ].filter(s => s.value).map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 line-clamp-1">{s.value}</p>
                </div>
              ))}
            </div>
            {/* Compare button */}
            <Link
              href={`/gadget/compare?slugs=${device.slug}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              ⚖️ So sánh thiết bị này
            </Link>
          </div>
        </div>

        {/* Prices from marketplaces */}
        <GadgetPricePanel deviceSlug={device.slug} deviceName={device.name} />

        {/* Full specs */}
        <h2 className="mb-4 mt-10 text-lg font-bold text-slate-900">Thông số kỹ thuật đầy đủ</h2>
        <SpecsTable specs={device.specs} />

        {device.gsmarenaUrl && (
          <p className="mt-6 text-xs text-slate-400">
            Nguồn: <a href={device.gsmarenaUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">GSMArena</a>
          </p>
        )}
      </div>
    </PublicLayout>
  );
}
