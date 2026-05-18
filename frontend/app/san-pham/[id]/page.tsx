import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { JsonLd } from '@/components/shared/JsonLd';
import { ProductGallery } from '@/components/product/ProductGallery';
import { PriceComparisonTable } from '@/components/product/PriceComparisonTable';
import { PriceHistoryChart } from '@/components/product/PriceHistoryChart';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { ProductViewTracker } from '@/components/product/ProductViewTracker';
import { getProductPrices, getPriceHistory } from '@/lib/api/products';
import { searchProducts } from '@/lib/api/search';
import { formatPrice } from '@/lib/utils/format';
import type { ProductCardData } from '@/components/shared/ProductCard';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface ProductPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  try {
    const comparison = await getProductPrices(params.id);
    const title = `${comparison.productName} — So sánh giá | SSCO`;
    const description = `So sánh giá ${comparison.productName} từ ${comparison.availableSources} nguồn. Giá tốt nhất: ${formatPrice(comparison.lowestPrice?.price)}.`;

    return {
      title,
      description,
      openGraph: { title, description, type: 'website' },
      alternates: { canonical: `${SITE_URL}/san-pham/${params.id}` },
    };
  } catch {
    return { title: 'Sản phẩm | SSCO' };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = params;

  let comparison;
  let history;
  try {
    [comparison, history] = await Promise.all([
      getProductPrices(id),
      getPriceHistory(id, { days: 30 }),
    ]);
  } catch {
    notFound();
  }

  const keyword = comparison.productName.split(/\s+/).slice(0, 3).join(' ');
  const relatedResults = await searchProducts({ keyword, limit: 8 }).catch(() => null);
  const related: ProductCardData[] =
    relatedResults?.results
      .filter((p) => String(p.id) !== id)
      .slice(0, 6)
      .map((p) => ({
        id: String(p.id),
        name: p.name,
        image: p.images[0],
        categoryName: p.categoryName,
        lowestPrice: p.lowestPrice ?? p.priceRange?.min,
      })) ?? [];

  const images = comparison.prices
    .map((p) => p.metadata?.image as string | undefined)
    .filter((img): img is string => Boolean(img));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: comparison.productName,
    offers: comparison.prices
      .filter((p) => p.isAvailable)
      .map((p) => ({
        '@type': 'Offer',
        price: p.price,
        priceCurrency: p.currency || 'VND',
        availability: p.isAvailable
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: p.source },
        url: p.sourceUrl,
      })),
  };

  return (
    <PublicLayout>
      <ProductViewTracker productId={id} />
      <JsonLd data={jsonLd} />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Trang chủ', href: '/' },
            { label: 'Tìm kiếm', href: '/search' },
            { label: comparison.productName },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <ProductGallery images={images} productName={comparison.productName} />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              {comparison.productName}
            </h1>
            {comparison.lowestPrice && (
              <p className="mt-3 text-3xl font-bold text-primary-600">
                {formatPrice(comparison.lowestPrice.price)}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  tại {comparison.lowestPrice.source}
                </span>
              </p>
            )}
            {comparison.averagePrice > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                Giá trung bình: {formatPrice(comparison.averagePrice)} ·{' '}
                {comparison.availableSources} nguồn
              </p>
            )}
          </div>
        </div>

        <div className="mt-10 space-y-10">
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">So sánh giá</h2>
            <PriceComparisonTable comparison={comparison} productId={id} />
          </section>

          <PriceHistoryChart history={history} />

          <RelatedProducts products={related} />
        </div>
      </section>
    </PublicLayout>
  );
}
