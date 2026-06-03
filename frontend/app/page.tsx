import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { SearchBar } from '@/components/home/SearchBar';
import { PopularKeywords } from '@/components/home/PopularKeywords';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { DealsSection } from '@/components/home/DealsSection';
import { VoucherTabs } from '@/components/home/VoucherTabs';
import { SuggestedToday } from '@/components/home/SuggestedToday';
import { GadgetSearchBar } from '@/components/gadget/GadgetSearchBar';
import { getBestDeals, getCategoryTree } from '@/lib/api/catalog';
import { getPopularKeywords } from '@/lib/api/search';
import { getGadgetBrands } from '@/lib/api/gadget';

const CATEGORY_ICONS: Record<string, string> = {
  mobile: '📱', tablet: '📲', smartwatch: '⌚',
};

interface HomePageProps {
  searchParams: { tab?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const isGadget = searchParams.tab === 'gadget';

  /* ── Gadget tab ───────────────────────────────────────────────── */
  if (isGadget) {
    const brands = await getGadgetBrands().catch((err) => { console.error('[HomePage] getGadgetBrands', err); return []; });

    return (
      <PublicLayout>
        <section className="bg-gradient-to-b from-primary-50 to-white">
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pb-16 sm:pt-12">

            <div className="text-center">
              <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                So sánh Thiết bị
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:mt-4 sm:text-lg">
                Tra cứu và so sánh thông số kỹ thuật điện thoại, máy tính bảng, đồng hồ thông minh
              </p>
            </div>

            <div className="mt-6 sm:mt-10">
              <GadgetSearchBar />
            </div>

            {/* Category quick links */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { key: 'mobile',      label: 'Điện thoại' },
                { key: 'tablet',      label: 'Máy tính bảng' },
                { key: 'smartwatch',  label: 'Đồng hồ thông minh' },
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
            {brands.length > 0 && (
              <div className="mt-10">
                <h2 className="mb-4 text-lg font-semibold text-slate-800">Chọn hãng</h2>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {brands.map((brand) => (
                    <Link
                      key={brand.slug}
                      href={`/gadget/${brand.slug}`}
                      className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-primary-400 hover:shadow-md"
                    >
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.name} className="h-12 w-12 object-contain" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-400">
                          {brand.name.slice(0, 1)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-primary-700">
                        {brand.name}
                      </span>
                      {brand.deviceCount !== undefined && brand.deviceCount > 0 && (
                        <span className="text-xs text-slate-400">{brand.deviceCount} thiết bị</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {brands.length === 0 && (
              <p className="mt-12 text-center text-slate-500">Chưa có dữ liệu thiết bị.</p>
            )}
          </div>
        </section>
      </PublicLayout>
    );
  }

  /* ── Price comparison tab (default) ──────────────────────────── */
  const [categories, keywords, deals] = await Promise.all([
    getCategoryTree().catch((err) => { console.error('[HomePage] getCategoryTree', err); return []; }),
    getPopularKeywords(8).catch((err) => { console.error('[HomePage] getPopularKeywords', err); return []; }),
    getBestDeals(8).catch((err) => { console.error('[HomePage] getBestDeals', err); return []; }),
  ]);

  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-primary-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pb-16 sm:pt-12">

          <div className="text-center">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              So sánh giá từ Tiki, Lazada, Shopee
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:mt-4 sm:text-lg">
              Tìm giá tốt nhất trước khi mua — không cần đăng nhập
            </p>
          </div>

          <div className="mt-6 sm:mt-10">
            <SearchBar />
            <PopularKeywords keywords={keywords} />
          </div>

          <CategoryGrid categories={categories} />
          <VoucherTabs featured className="mt-16" />
          <DealsSection deals={deals} />
          <SuggestedToday deals={deals} />
        </div>
      </section>
    </PublicLayout>
  );
}
