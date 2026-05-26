import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { JsonLd } from '@/components/shared/JsonLd';
import { ProductGallery } from '@/components/product/ProductGallery';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { YouMightAlsoLike } from '@/components/product/YouMightAlsoLike';
import { ProductViewTracker } from '@/components/product/ProductViewTracker';
import { getProductPrices, getPriceHistory, getProductById } from '@/lib/api/products';
import { searchProducts } from '@/lib/api/search';
import { getBestDeals } from '@/lib/api/catalog';
import { formatPrice } from '@/lib/utils/format';
import { getSiteConfig } from '@/lib/api/site-config';
import type { ProductCardData } from '@/components/shared/ProductCard';
import { VoucherTable } from '@/components/product/VoucherTable';
import { ProductTabsSection } from '@/components/product/ProductTabsSection';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface ProductPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  try {
    const comparison = await getProductPrices(params.slug);
    const title = `${comparison.productName} — So sánh giá | ${siteName}`;
    const description = `So sánh giá ${comparison.productName} từ ${comparison.availableSources} nguồn. Giá tốt nhất: ${formatPrice(comparison.lowestPrice?.price)}.`;

    return {
      title,
      description,
      openGraph: { title, description, type: 'website' },
      alternates: { canonical: `${SITE_URL}/san-pham/${params.slug}` },
    };
  } catch {
    return { title: `Sản phẩm | ${siteName}` };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = params;

  let comparison;
  let history;
  let product;
  try {
    [comparison, history, product] = await Promise.all([
      getProductPrices(slug),
      getPriceHistory(slug, { days: 30 }),
      getProductById(slug),
    ]);
  } catch {
    notFound();
  }

  const keyword = comparison.productName.split(/\s+/).slice(0, 3).join(' ');
  const [relatedResults, allDeals] = await Promise.all([
    searchProducts({ keyword, limit: 9 }).catch(() => null),
    getBestDeals(16).catch(() => []),
  ]);
  const resolvedId = String(comparison.productId);
  const related: ProductCardData[] =
    relatedResults?.results
      .filter((p) => String(p.id) !== resolvedId)
      .slice(0, 8)
      .map((p) => ({
        id: String(p.id),
        slug: p.slug,
        name: p.name,
        image: p.images[0],
        categoryName: p.categoryName,
        lowestPrice: p.lowestPrice ?? p.priceRange?.min,
        brand: p.brand,
      })) ?? [];

  const crossCategoryDeals = allDeals
    .filter((d) => String(d.productId) !== resolvedId && d.categoryId !== product?.categoryId)
    .slice(0, 8);

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

  const lowestSource = comparison.lowestPrice?.source || 'tiki';

  const relatedKeywords = [
    comparison.productName + ' giá rẻ',
    comparison.productName + ' chính hãng',
    ...(product?.brand ? [product.brand + ' ' + comparison.productName.split(/\s+/).slice(-2).join(' ')] : []),
    comparison.productName + ' ' + (product?.categoryName || ''),
  ].filter(Boolean).slice(0, 6);

  const breadcrumbItems = [
    { label: 'Trang chủ', href: '/' },
    ...(product?.categorySlug && product?.categoryName
      ? [{ label: product.categoryName, href: `/danh-muc/${product.categorySlug}` }]
      : []),
    { label: comparison.productName },
  ];

  return (
    <PublicLayout>
      <ProductViewTracker productId={resolvedId} />
      <JsonLd data={jsonLd} />
      <section className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="mt-4 grid gap-6 sm:mt-6 sm:gap-8 lg:grid-cols-[420px_1fr]">
          <ProductGallery images={product?.images ?? []} productName={comparison.productName} />

          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl md:text-3xl">
              {comparison.productName}
            </h1>

            {(product?.categoryName || product?.brand) && (
              <p className="mt-1 text-sm text-slate-500">
                {[product.categoryName, product.brand].filter(Boolean).join(' · ')}
              </p>
            )}

            {comparison.lowestPrice && (
              <>
                <p className="mt-3 text-3xl font-bold text-primary-700">
                  {formatPrice(comparison.lowestPrice.price)}
                </p>
                <p className="mt-1 text-sm text-green-600">
                  Giá thấp nhất trên <span className="font-bold capitalize">{comparison.lowestPrice.source}</span>
                </p>
              </>
            )}
            {comparison.averagePrice > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                Giá trung bình: {formatPrice(comparison.averagePrice)} · {comparison.availableSources} nguồn
              </p>
            )}

            {product?.description && (
              <p className="mt-4 leading-relaxed text-slate-700">{product.description}</p>
            )}

            <div className="mt-6">
              <VoucherTable source={lowestSource} />
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-sm font-bold text-slate-900">Từ khóa liên quan</h3>
              <div className="flex flex-wrap gap-2">
                {relatedKeywords.map((k) => (
                  <Link
                    key={k}
                    href={`/search?q=${encodeURIComponent(k)}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                  >
                    {k}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <ProductTabsSection comparison={comparison} history={history} productId={resolvedId} />
        </div>

        <RelatedProducts products={related} searchKeyword={keyword} />
        <YouMightAlsoLike deals={crossCategoryDeals} />
      </section>
    </PublicLayout>
  );
}
