import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getBestDeals } from '@/lib/api/catalog';
import { formatPrice } from '@/lib/utils/format';
import { getSiteConfig } from '@/lib/api/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  return {
    title: `Ưu đãi tốt nhất | ${siteName}`,
    description: 'Danh sách sản phẩm giảm giá nhiều nhất từ Tiki, Lazada, Shopee.',
  };
}

export default async function DealsPage() {
  const deals = await getBestDeals(24).catch((err) => { console.error('[DealsPage] getBestDeals', err); return []; });

  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Ưu đãi tốt nhất</h1>
        <p className="mt-2 text-slate-600">Sản phẩm đang giảm giá mạnh trên các sàn</p>

        {deals.length === 0 ? (
          <p className="mt-12 text-center text-slate-500">Chưa có ưu đãi nào.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deals.map((deal) => (
              <Link
                key={String(deal.productId)}
                href={`/san-pham/${deal.slug ?? deal.productId}`}
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
                    <span className="flex h-full items-center justify-center text-4xl">📦</span>
                  )}
                  <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    -{Math.round(deal.discountPercentage)}%
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="line-clamp-2 text-sm font-semibold text-slate-900">
                    {deal.productName}
                  </h2>
                  <p className="mt-2 text-lg font-bold text-primary-600">
                    {formatPrice(deal.currentPrice)}
                  </p>
                  <p className="text-xs text-slate-400 line-through">
                    {formatPrice(deal.originalPrice)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{deal.source}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
