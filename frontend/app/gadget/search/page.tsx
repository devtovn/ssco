import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { searchGadgets } from '@/lib/api/gadget';
import { getSiteConfig } from '@/lib/api/site-config';

interface Props {
  searchParams: { q?: string; category?: string; brand?: string; page?: string };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  const label = searchParams.q || searchParams.category || 'Tất cả';
  return { title: `${label} | Tìm thiết bị | ${siteName}` };
}

const CATEGORY_LABELS: Record<string, string> = {
  mobile: '📱 Điện thoại', tablet: '📲 Máy tính bảng', smartwatch: '⌚ Đồng hồ',
};
const CATEGORY_ICONS: Record<string, string> = {
  mobile: '📱', tablet: '📲', smartwatch: '⌚',
};

export default async function GadgetSearchPage({ searchParams }: Props) {
  const page = parseInt(searchParams.page ?? '1');
  const { devices, pagination } = await searchGadgets({
    q: searchParams.q,
    category: searchParams.category,
    brand: searchParams.brand,
    page,
  }).catch(() => ({ devices: [], pagination: { page: 1, limit: 24, total: 0, totalPages: 0 } }));

  const title = searchParams.q
    ? `Kết quả cho "${searchParams.q}"`
    : searchParams.category
    ? CATEGORY_LABELS[searchParams.category] ?? searchParams.category
    : 'Tất cả thiết bị';

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {/* Back + title */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/gadget" className="text-sm text-primary-600 hover:underline">← Chọn hãng</Link>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <span className="text-sm text-slate-500">({pagination.total} thiết bị)</span>
        </div>

        {/* Category filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/gadget/search"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!searchParams.category ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Tất cả
          </Link>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Link key={key}
              href={`/gadget/search?category=${key}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ''}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${searchParams.category === key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Device grid */}
        {devices.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {devices.map((device) => (
              <Link
                key={device.slug}
                href={`/gadget/${device.brandSlug}/${device.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary-400 hover:shadow-md"
              >
                <div className="flex aspect-square w-full items-center justify-center bg-slate-50">
                  {device.imageUrl
                    ? <img src={device.imageUrl} alt={device.name} className="h-full w-full object-contain p-4" />
                    : <span className="text-5xl">{CATEGORY_ICONS[device.category] ?? '📱'}</span>}
                </div>
                <div className="p-3">
                  <p className="text-xs text-slate-400">{device.brandName}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                    {device.name}
                  </p>
                  {device.announced && <p className="mt-1 text-xs text-slate-400">{device.announced}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-500">
            <p>Không tìm thấy thiết bị phù hợp.</p>
            <Link href="/gadget" className="mt-3 inline-block text-sm text-primary-600 hover:underline">
              Xem tất cả hãng →
            </Link>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {page > 1 && (
              <Link href={`/gadget/search?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                ← Trước
              </Link>
            )}
            <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              {page} / {pagination.totalPages}
            </span>
            {page < pagination.totalPages && (
              <Link href={`/gadget/search?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                Tiếp →
              </Link>
            )}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
