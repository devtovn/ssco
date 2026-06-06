import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getGadgetBrands } from '@/lib/api/gadget';
import { getSiteConfig } from '@/lib/api/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  return {
    title: `So sánh Thiết bị | ${siteName}`,
    description: 'So sánh thông số kỹ thuật điện thoại, máy tính bảng, đồng hồ thông minh từ tất cả các hãng lớn.',
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  mobile: '📱', tablet: '📲', smartwatch: '⌚',
};

export default async function GadgetPage() {
  const brands = await getGadgetBrands().catch((err) => { console.error('[GadgetPage] getGadgetBrands', err); return []; });

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">So sánh Thiết bị</h1>
          <p className="mt-2 text-sm text-slate-500">
            Tra cứu và so sánh thông số kỹ thuật điện thoại, máy tính bảng, đồng hồ thông minh
          </p>
        </div>

        {/* Category quick filter */}
        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {[
            { key: 'mobile', label: 'Điện thoại' },
            { key: 'tablet', label: 'Máy tính bảng' },
            { key: 'smartwatch', label: 'Đồng hồ thông minh' },
          ].map((cat) => (
            <Link
              key={cat.key}
              href={`/gadget/search?category=${cat.key}`}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary-400 hover:text-primary-700"
            >
              <span>{CATEGORY_ICONS[cat.key]}</span>
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Brand grid */}
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Chọn hãng</h2>
        <div className="flex flex-wrap gap-2">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/gadget/${brand.slug}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary-400 hover:text-primary-700"
            >
              {brand.name}
            </Link>
          ))}
        </div>

        {brands.length === 0 && (
          <p className="mt-12 text-center text-slate-500">Chưa có dữ liệu thiết bị.</p>
        )}
      </section>
    </PublicLayout>
  );
}
