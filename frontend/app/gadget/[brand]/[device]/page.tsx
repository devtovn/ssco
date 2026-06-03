import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { SpecsTable } from '@/components/gadget/SpecsTable';
import { GadgetPricePanel } from '@/components/gadget/GadgetPricePanel';
import { getGadgetDevice, getGadgetBrands } from '@/lib/api/gadget';
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

  const CATEGORY_ICONS: Record<string, string> = { mobile: '📱', tablet: '📲', smartwatch: '⌚' };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
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

        {/* Hero: image + name + quick specs */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto flex h-56 w-56 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white sm:mx-0">
            {device.imageUrl ? (
              <img src={device.imageUrl} alt={device.name} className="h-full w-full object-contain p-4" />
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
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: 'Màn hình', value: device.specs.display?.size },
                { label: 'Chipset', value: device.specs.platform?.chipset },
                { label: 'Camera', value: device.specs.main_camera?.specs?.split(',')[0] },
                { label: 'Pin', value: device.specs.battery?.capacity },
                { label: 'RAM', value: device.specs.memory?.internal },
                { label: 'OS', value: device.specs.platform?.os },
              ].filter(s => s.value).map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 line-clamp-1">{s.value}</p>
                </div>
              ))}
            </div>
            <Link
              href={`/gadget/compare?slugs=${device.slug}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              ⚖️ So sánh thiết bị này
            </Link>
          </div>
        </div>

        {/* Prices */}
        <GadgetPricePanel deviceSlug={device.slug} deviceName={device.name} />

        {/* Main content: brands sidebar (3/12) + specs table (9/12) */}
        <h2 className="mb-4 mt-10 text-lg font-bold text-slate-900">Thông số kỹ thuật đầy đủ</h2>

        <div className="flex gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {/* Left sidebar: all brands — 3/12 */}
          <aside className="hidden w-3/12 shrink-0 border-r border-slate-200 bg-slate-50 md:block">
            <div className="sticky top-0 overflow-y-auto" style={{ maxHeight: '80vh' }}>
              <h3 className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Hãng sản xuất
              </h3>
              <ul>
                {brands.map((b) => {
                  const isActive = b.slug === params.brand;
                  return (
                    <li key={b.id}>
                      <Link
                        href={`/gadget/${b.slug}`}
                        className={`flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-primary-50 font-bold text-primary-700 border-l-4 border-l-primary-600'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {b.logoUrl ? (
                          <img src={b.logoUrl} alt={b.name} className="h-5 w-5 object-contain" />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-600">
                            {b.name[0]}
                          </span>
                        )}
                        <span className="flex-1">{b.name}</span>
                        {b.deviceCount != null && b.deviceCount > 0 && (
                          <span className="text-xs text-slate-400">{b.deviceCount}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Right: specs table — 9/12 */}
          <div className="w-full md:w-9/12">
            <SpecsTable specs={device.specs} />
          </div>
        </div>

        {device.gsmarenaUrl && (
          <p className="mt-6 text-xs text-slate-400">
            Nguồn: <a href={device.gsmarenaUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">GSMArena</a>
          </p>
        )}
      </div>
    </PublicLayout>
  );
}
