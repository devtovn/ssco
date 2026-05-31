import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { SearchBar } from '@/components/home/SearchBar';
import { PopularKeywords } from '@/components/home/PopularKeywords';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { DealsSection } from '@/components/home/DealsSection';
import { VoucherTabs } from '@/components/home/VoucherTabs';
import { SuggestedToday } from '@/components/home/SuggestedToday';
import { getBestDeals, getCategoryTree } from '@/lib/api/catalog';
import { getPopularKeywords } from '@/lib/api/search';

export default async function HomePage() {
  const [categories, keywords, deals] = await Promise.all([
    getCategoryTree().catch(() => []),
    getPopularKeywords(8).catch(() => []),
    getBestDeals(8).catch(() => []),
  ]);

  return (
    <PublicLayout>
      <section className="bg-gradient-to-b from-primary-50 to-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:pb-16 sm:pt-12">

          {/* ── Mode tabs ── */}
          <div className="mb-6 flex justify-center sm:mb-8">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <span className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white">
                💰 So sánh giá
              </span>
              <Link
                href="/gadget"
                className="rounded-xl px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                📱 So sánh Thiết bị
              </Link>
            </div>
          </div>

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
