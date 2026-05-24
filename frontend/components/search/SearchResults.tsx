'use client';

import { useRouter } from 'next/navigation';
import { SearchBar } from '@/components/home/SearchBar';
import { ProductCard, type ProductCardData } from '@/components/shared/ProductCard';
import { SearchFilters } from './SearchFilters';
import type { SearchResponse } from '@price-comparison/types';

interface SearchResultsProps {
  keyword: string;
  results: SearchResponse | null;
  error: string | null;
  page: number;
}

function toCard(product: SearchResponse['results'][0]): ProductCardData {
  return {
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    image: product.images[0],
    categoryName: product.categoryName,
    lowestPrice: product.lowestPrice ?? product.priceRange?.min,
    brand: product.brand,
  };
}

export function SearchResults({ keyword, results, error, page }: SearchResultsProps) {
  const router = useRouter();

  return (
    <>
      <div className="mt-6 max-w-2xl">
        <SearchBar />
      </div>

      {!keyword && (
        <p className="mt-8 text-slate-600">Nhập từ khóa để bắt đầu tìm kiếm sản phẩm.</p>
      )}

      {error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {results && keyword && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <SearchFilters keyword={keyword} filters={results.filters} />

          <div>
            <p className="text-sm text-slate-500">
              {results.pagination.total} kết quả · {results.searchTime}ms
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.results.map((product) => (
                <ProductCard key={String(product.id)} product={toCard(product)} />
              ))}
            </div>

            {results.results.length === 0 && (
              <p className="mt-8 text-center text-slate-600">Không tìm thấy sản phẩm phù hợp.</p>
            )}

            {results.pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set('page', String(page - 1));
                    router.push(`/search?${params.toString()}`);
                  }}
                  className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="px-4 py-2 text-sm text-slate-600">
                  Trang {page} / {results.pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= results.pagination.totalPages}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    params.set('page', String(page + 1));
                    router.push(`/search?${params.toString()}`);
                  }}
                  className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
