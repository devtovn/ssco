'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';
import type { Deal } from '@/lib/api/catalog';

const PAGE_SIZE = 4;

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

interface YouMightAlsoLikeProps {
  deals: Deal[];
}

export function YouMightAlsoLike({ deals }: YouMightAlsoLikeProps) {
  const [shown, setShown] = useState(PAGE_SIZE);
  if (deals.length === 0) return null;

  const items = deals.slice(0, shown);
  const hasMore = shown < deals.length;

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Có thể bạn cũng thích</h2>
          <p className="mt-1 text-sm text-slate-500">Gợi ý từ các danh mục phổ biến khác</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((deal) => {
          const badge = getBadge(deal);
          const badgeStyle = badge
            ? (BADGE_STYLE[badge] ?? BADGE_STYLE['Giảm giá'])
            : null;
          return (
            <Link
              key={deal.productId}
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
                {deal.categoryName && (
                  <p className="text-xs text-slate-400">{deal.categoryName}</p>
                )}
                <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                  {deal.productName}
                </h3>
                <p className="mt-auto pt-2 text-base font-bold text-primary-600">
                  {formatPrice(deal.currentPrice)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
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
