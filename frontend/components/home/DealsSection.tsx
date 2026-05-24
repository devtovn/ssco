import Image from 'next/image';
import Link from 'next/link';
import type { Deal } from '@/lib/api/catalog';

function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

interface DealsSectionProps {
  deals: Deal[];
}

export function DealsSection({ deals }: DealsSectionProps) {
  if (deals.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Ưu đãi tốt nhất</h2>
        <Link href="/deals" className="text-sm font-medium text-primary-600 hover:text-primary-700">
          Xem tất cả →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {deals.map((deal) => (
          <Link
            key={String(deal.productId)}
            href={`/san-pham/${deal.slug ?? deal.productId}`}
            className="block"
          >
          <article
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-square bg-slate-100">
              {deal.productImage ? (
                <Image
                  src={deal.productImage}
                  alt={deal.productName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl">📦</div>
              )}
              <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                -{Math.round(deal.discountPercentage)}%
              </span>
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{deal.productName}</h3>
              <p className="mt-2 text-lg font-bold text-primary-600">{formatPrice(deal.currentPrice)}</p>
              <p className="text-xs text-slate-400 line-through">{formatPrice(deal.originalPrice)}</p>
              <p className="mt-1 text-xs text-slate-500">{deal.source}</p>
            </div>
          </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
