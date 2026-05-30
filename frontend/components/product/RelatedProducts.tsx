'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';
import type { ProductCardData } from '@/components/shared/ProductCard';

const PAGE_SIZE = 8;

interface RelatedProductsProps {
  products: ProductCardData[];
  searchKeyword?: string;
}

function ProductCardItem({ p }: { p: ProductCardData }) {
  const price = p.lowestPrice ?? p.priceMin;
  return (
    <Link
      href={`/san-pham/${p.slug ?? p.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="flex aspect-square w-full items-center justify-center bg-slate-100">
        <span className="text-4xl" aria-hidden>📦</span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        {p.categoryName && <p className="text-xs text-slate-400">{p.categoryName}</p>}
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 group-hover:text-primary-700">
          {p.name}
        </h3>
        {p.brand && <p className="mt-1 text-xs text-slate-400">{p.brand}</p>}
        <p className="mt-auto pt-2 text-base font-bold text-primary-600">{formatPrice(price)}</p>
      </div>
    </Link>
  );
}

export function RelatedProducts({ products, searchKeyword }: RelatedProductsProps) {
  const [shown, setShown] = useState(PAGE_SIZE);
  if (products.length === 0) return null;

  const mobileItems = products; // show all on mobile carousel
  const desktopItems = products.slice(0, shown);
  const hasMore = shown < products.length;

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sản phẩm liên quan</h2>
          <p className="mt-1 text-sm text-slate-500">Các sản phẩm cùng phân khúc, được so sánh phổ biến nhất</p>
        </div>
        {searchKeyword && (
          <Link
            href={`/search?q=${encodeURIComponent(searchKeyword)}`}
            className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Xem tất cả →
          </Link>
        )}
      </div>

      {/* ── Mobile: 2-row horizontal scroll carousel ─────────────────────────── */}
      {/* -mx-4 extends scroll area to screen edge; pl-4 aligns first card with page content */}
      <div
        className="-mx-4 overflow-x-auto pb-2 sm:hidden"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          scrollPaddingLeft: '1rem',
        }}
      >
        <div
          className="grid grid-rows-2 grid-flow-col gap-3 pl-4 pr-2"
          style={{
            // >2 items: card ≈ 98% viewport → peek ~2% of next card
            // ≤2 items: card fills full container width (no peek needed)
            gridAutoColumns:
              mobileItems.length > 2
                ? 'calc(100vw - 2.75rem)'
                : 'calc(100vw - 2rem)',
          }}
        >
          {mobileItems.map((p) => (
            <div key={p.id} style={{ scrollSnapAlign: 'start' }}>
              <ProductCardItem p={p} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop: standard grid ────────────────────────────────────────────── */}
      <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 gap-4">
        {desktopItems.map((p) => (
          <ProductCardItem key={p.id} p={p} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-5 hidden sm:flex justify-center">
          <button
            onClick={() => setShown((s) => Math.min(s + PAGE_SIZE, products.length))}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-400 hover:text-primary-700"
          >
            Xem thêm ({Math.min(PAGE_SIZE, products.length - shown)} sản phẩm) →
          </button>
        </div>
      )}
    </section>
  );
}
