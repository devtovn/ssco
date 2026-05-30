'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';
import type { Deal } from '@/lib/api/catalog';

const PAGE_SIZE = 8;

const BADGE_STYLE: Record<string, string> = {
  'Bán chạy': 'bg-red-100 text-red-700',
  'Giảm giá': 'bg-amber-100 text-amber-800',
  'Mới': 'bg-primary-100 text-primary-800',
};

function getBadge(deal: Deal): string | null {
  if (deal.discountPercentage >= 30) return 'Bán chạy';
  if (deal.discountPercentage >= 15) return `Giảm ${Math.round(deal.discountPercentage)}%`;
  return null;
}

function DealCardItem({ deal }: { deal: Deal }) {
  const badge = getBadge(deal);
  const badgeStyle = badge ? (BADGE_STYLE[badge] ?? BADGE_STYLE['Giảm giá']) : null;
  return (
    <Link
      href={`/san-pham/${deal.slug ?? deal.productId}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md"
    >
      <div className="relative flex aspect-square w-full items-center justify-center bg-slate-100">
        <span className="text-4xl" aria-hidden>📦</span>
        {badge && badgeStyle && (
          <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold ${badgeStyle}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {deal.categoryName && <p className="text-xs text-slate-400">{deal.categoryName}</p>}
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 group-hover:text-primary-700">
          {deal.productName}
        </h3>
        <p className="mt-auto pt-2 text-base font-bold text-primary-600">
          {formatPrice(deal.currentPrice)}
        </p>
      </div>
    </Link>
  );
}

interface YouMightAlsoLikeProps {
  deals: Deal[];
}

export function YouMightAlsoLike({ deals }: YouMightAlsoLikeProps) {
  const [shown, setShown] = useState(PAGE_SIZE);
  if (deals.length === 0) return null;

  const desktopItems = deals.slice(0, shown);
  const hasMore = shown < deals.length;

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Có thể bạn cũng thích</h2>
          <p className="mt-1 text-sm text-slate-500">Gợi ý từ các danh mục phổ biến khác</p>
        </div>
        <Link href="/deals" className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700">
          Xem tất cả →
        </Link>
      </div>

      {/* ── Mobile: 2-row horizontal scroll carousel ─────────────────────────── */}
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
            gridAutoColumns:
              deals.length > 2
                ? 'calc(100vw - 2.75rem)'
                : 'calc(100vw - 2rem)',
          }}
        >
          {deals.map((deal) => (
            <div key={deal.productId} style={{ scrollSnapAlign: 'start' }}>
              <DealCardItem deal={deal} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop: standard grid ────────────────────────────────────────────── */}
      <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 gap-4">
        {desktopItems.map((deal) => (
          <DealCardItem key={deal.productId} deal={deal} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 hidden sm:flex justify-center">
          <button
            onClick={() => setShown((s) => Math.min(s + PAGE_SIZE, deals.length))}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-400 hover:text-primary-700"
          >
            Xem thêm ({Math.min(PAGE_SIZE, deals.length - shown)} sản phẩm) →
          </button>
        </div>
      )}
    </section>
  );
}
