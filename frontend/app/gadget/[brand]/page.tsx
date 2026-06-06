import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getBrandDevices } from '@/lib/api/gadget';
import { getSiteConfig } from '@/lib/api/site-config';

interface Props {
  params: { brand: string };
  searchParams: { category?: string; page?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  return { title: `${params.brand} | So sánh Thiết bị | ${siteName}` };
}

const CATEGORY_LABELS: Record<string, string> = {
  mobile: 'Điện thoại', tablet: 'Máy tính bảng', smartwatch: 'Đồng hồ',
};
const CATEGORY_ICONS: Record<string, string> = {
  mobile: '📱', tablet: '📲', smartwatch: '⌚',
};

export default async function BrandPage({ params, searchParams }: Props) {
  let data: Awaited<ReturnType<typeof getBrandDevices>>;
  try {
    data = await getBrandDevices(params.brand, {
      category: searchParams.category,
      page: searchParams.page ? parseInt(searchParams.page) : 1,
    });
  } catch {
    notFound();
  }

  const { brand, devices, pagination } = data;
  const activeCat = searchParams.category ?? '';

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {/* Brand header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{brand.name}</h1>
          <p className="text-sm text-slate-500">{pagination.total} thiết bị</p>
        </div>

        {/* Category tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={`/gadget/${params.brand}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!activeCat ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Tất cả
          </Link>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Link
              key={key}
              href={`/gadget/${params.brand}?category=${key}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeCat === key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Device grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {devices.map((device) => (
            <Link
              key={device.slug}
              href={`/gadget/${params.brand}/${device.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary-400 hover:shadow-md"
            >
              <div className="flex aspect-square w-full items-center justify-center bg-slate-50">
                {device.imageUrl ? (
                  <img src={device.imageUrl} alt={device.name} className="h-full w-full object-contain p-4" />
                ) : (
                  <span className="text-5xl">{CATEGORY_ICONS[device.category] ?? '📱'}</span>
                )}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                  {device.name}
                </p>
                {device.announced && (
                  <p className="mt-1 text-xs text-slate-400">{device.announced}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {devices.length === 0 && (
          <p className="mt-12 text-center text-slate-500">Chưa có thiết bị nào.</p>
        )}
      </section>
    </PublicLayout>
  );
}
