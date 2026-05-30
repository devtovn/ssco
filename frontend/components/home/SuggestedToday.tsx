import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';
import type { Deal } from '@/lib/api/catalog';

const BADGE_STYLE: Record<string, string> = {
  'Gợi ý hôm nay': 'bg-primary-100 text-primary-800',
  'Giảm giá': 'bg-red-100 text-red-700',
  'Bán chạy': 'bg-amber-100 text-amber-800',
};

interface SuggestedTodayProps {
  deals: Deal[];
}

export function SuggestedToday({ deals }: SuggestedTodayProps) {
  if (!deals.length) return null;

  return (
    <section className="mt-10 sm:mt-16">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Sản phẩm gợi ý hôm nay</h2>
          <p className="mt-1 text-sm text-slate-500">Được cập nhật mỗi ngày dựa trên xu hướng tìm kiếm</p>
        </div>
        <Link href="/deals" className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700">
          Xem tất cả →
        </Link>
      </div>
      {/* ── Mobile: 4-row horizontal scroll carousel ── */}
      <div
        className="-mx-4 overflow-x-auto pb-2 sm:hidden"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          scrollPaddingLeft: '1rem',
        }}
      >
        <div
          className="grid grid-rows-4 grid-flow-col gap-3 pl-4 pr-2"
          style={{
            gridAutoColumns:
              deals.length > 4
                ? 'calc(100vw - 2.75rem)'
                : 'calc(100vw - 2rem)',
          }}
        >
          {deals.map((p) => {
            const badge = p.discountPercentage >= 30 ? 'Giảm giá' : 'Gợi ý hôm nay';
            return (
              <div key={String(p.productId)} style={{ scrollSnapAlign: 'start' }}>
                <Link
                  href={`/san-pham/${p.slug ?? p.productId}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md"
                >
                  <div className="relative flex aspect-square w-full items-center justify-center bg-slate-100">
                    <span className="text-4xl" aria-hidden>📦</span>
                    <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold ${BADGE_STYLE[badge]}`}>
                      {badge}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    {p.categoryName && <p className="text-xs text-slate-400">{p.categoryName}</p>}
                    <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                      {p.productName}
                    </h3>
                    <p className="mt-auto pt-2 text-base font-bold text-primary-600">{formatPrice(p.currentPrice)}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Desktop: standard grid ── */}
      <div className="hidden sm:grid sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {deals.map((p) => {
          const badge = p.discountPercentage >= 30 ? 'Giảm giá' : 'Gợi ý hôm nay';
          return (
            <Link
              key={String(p.productId)}
              href={`/san-pham/${p.slug ?? p.productId}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md"
            >
              <div className="relative flex aspect-square w-full items-center justify-center bg-slate-100">
                <span className="text-4xl" aria-hidden>📦</span>
                <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold ${BADGE_STYLE[badge]}`}>
                  {badge}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                {p.categoryName && <p className="text-xs text-slate-400">{p.categoryName}</p>}
                <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                  {p.productName}
                </h3>
                <p className="mt-auto pt-2 text-base font-bold text-primary-600">{formatPrice(p.currentPrice)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
