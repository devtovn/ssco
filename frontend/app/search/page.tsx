import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { SearchResults } from '@/components/search/SearchResults';
import { JsonLd } from '@/components/shared/JsonLd';
import { searchProducts, trackSearch } from '@/lib/api/search';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface SearchPageProps {
  searchParams: {
    q?: string;
    page?: string;
    categoryId?: string;
    minPrice?: string;
    maxPrice?: string;
    brand?: string;
    sortBy?: string;
  };
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const keyword = searchParams.q?.trim() || '';
  const title = keyword
    ? `Kết quả tìm kiếm "${keyword}" | SSCO`
    : 'Tìm kiếm sản phẩm | SSCO';
  const description = keyword
    ? `So sánh giá sản phẩm "${keyword}" từ Tiki, Lazada, Shopee và nhiều sàn khác.`
    : 'Tìm kiếm và so sánh giá sản phẩm trên SSCO.';

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    alternates: keyword
      ? { canonical: `${SITE_URL}/search?q=${encodeURIComponent(keyword)}` }
      : { canonical: `${SITE_URL}/search` },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const keyword = searchParams.q?.trim() || '';
  const page = parseInt(searchParams.page || '1', 10);

  let results = null;
  let error: string | null = null;

  if (keyword) {
    try {
      results = await searchProducts({
        keyword,
        page,
        limit: 20,
        categoryId: searchParams.categoryId,
        minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
        maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
        brand: searchParams.brand,
        sortBy: searchParams.sortBy as
          | 'relevance'
          | 'price_asc'
          | 'price_desc'
          | 'popularity'
          | 'newest'
          | undefined,
      });
      void trackSearch(keyword, results.results.length);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Không thể tải kết quả tìm kiếm';
    }
  }

  const jsonLd =
    results && keyword
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Kết quả tìm kiếm: ${keyword}`,
          numberOfItems: results.pagination.total,
          itemListElement: results.results.slice(0, 10).map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/san-pham/${item.id}`,
            name: item.name,
          })),
        }
      : null;

  return (
    <PublicLayout>
      {jsonLd && <JsonLd data={jsonLd} />}
      <section className="mx-auto max-w-6xl bg-slate-50 px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {keyword ? `Kết quả cho "${keyword}"` : 'Tìm kiếm sản phẩm'}
        </h1>
        <Suspense fallback={<p className="mt-4 text-slate-500">Đang tải…</p>}>
          <SearchResults keyword={keyword} results={results} error={error} page={page} />
        </Suspense>
      </section>
    </PublicLayout>
  );
}
