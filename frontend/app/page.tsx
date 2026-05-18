import { PublicLayout } from '@/components/layout/PublicLayout';
import { SearchBar } from '@/components/home/SearchBar';
import { PopularKeywords } from '@/components/home/PopularKeywords';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { DealsSection } from '@/components/home/DealsSection';
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
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12">
          <div className="text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              So sánh giá từ Tiki, Lazada, Shopee
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Tìm giá tốt nhất trước khi mua — không cần đăng nhập
            </p>
          </div>

          <div className="mt-10">
            <SearchBar />
            <PopularKeywords keywords={keywords} />
          </div>

          <CategoryGrid categories={categories} />
          <DealsSection deals={deals} />
        </div>
      </section>
    </PublicLayout>
  );
}
