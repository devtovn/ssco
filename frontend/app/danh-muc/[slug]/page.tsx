import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { ProductCard, type ProductCardData } from '@/components/shared/ProductCard';
import { JsonLd } from '@/components/shared/JsonLd';
import { VoucherTabs } from '@/components/home/VoucherTabs';
import { getCategoryBySlug, getCategoryProducts } from '@/lib/api/categories';
import { getSiteConfig } from '@/lib/api/site-config';
import { formatPrice } from '@/lib/utils/format';
import Link from 'next/link';

const CATEGORY_ICONS: Record<string, string> = {
  'dien-lanh': '❄️',
  'dien-thoai': '📱',
  'laptop': '💻',
  'thiet-bi-gia-dung': '🏠',
  'am-thanh-hinh-anh': '🎧',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface CategoryPageProps {
  params: { slug: string };
  searchParams: { page?: string };
}

function parseImages(images?: string[] | string): string | undefined {
  if (!images) return undefined;
  if (Array.isArray(images)) return images[0];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed[0] : undefined;
  } catch {
    return undefined;
  }
}

function toProductCard(row: {
  id: string;
  slug?: string;
  name: string;
  brand?: string;
  images?: string[] | string;
  lowest_price?: number;
}): ProductCardData {
  return {
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    image: parseImages(row.images),
    lowestPrice: row.lowest_price,
  };
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  try {
    const category = await getCategoryBySlug(params.slug);
    return {
      title: `${category.name} | ${siteName}`,
      description: category.description || `Sản phẩm danh mục ${category.name} — so sánh giá tốt nhất.`,
    };
  } catch {
    return { title: `Danh mục | ${siteName}` };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const page = parseInt(searchParams.page || '1', 10);

  let category;
  try {
    category = await getCategoryBySlug(params.slug);
  } catch {
    notFound();
  }

  const { products, pagination } = await getCategoryProducts(category.id, {
    page,
    limit: 20,
  }).catch((err) => { console.error('[CategoryPage] getCategoryProducts', err); return { products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }; });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description,
    url: `${SITE_URL}/danh-muc/${params.slug}`,
  };

  const icon = CATEGORY_ICONS[params.slug] || '🛒';

  return (
    <PublicLayout>
      <JsonLd data={jsonLd} />
      <section className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
        <Breadcrumbs
          items={[
            { label: 'Trang chủ', href: '/' },
            { label: category.name },
          ]}
        />

        <div className="mt-4 flex items-center gap-3 sm:mt-6 sm:gap-4">
          <span className="text-4xl sm:text-5xl" aria-hidden>{icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{category.name}</h1>
            <p className="text-sm text-slate-500">{pagination.total} sản phẩm · cập nhật mỗi 6 giờ</p>
          </div>
        </div>

        <VoucherTabs className="mt-8" />

        {/* ── Mobile: 3-row horizontal scroll carousel (vertical card layout) ── */}
        <div
          className="-mx-4 mt-6 overflow-x-auto pb-2 sm:hidden"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: '1rem',
          }}
        >
          <div
            className="grid grid-rows-3 grid-flow-col gap-3 pl-4 pr-2"
            style={{
              gridAutoColumns:
                products.length > 3
                  ? 'calc(100vw - 2.75rem)'
                  : 'calc(100vw - 2rem)',
            }}
          >
            {products.map((p) => {
              const card = toProductCard(p);
              const price = card.lowestPrice ?? card.priceMin;
              return (
                <div key={String(p.id)} style={{ scrollSnapAlign: 'start' }}>
                  <Link
                    href={`/san-pham/${card.slug ?? card.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md"
                  >
                    <div className="relative flex aspect-square w-full items-center justify-center bg-slate-100">
                      {card.image ? (
                        <Image
                          src={card.image}
                          alt={card.name}
                          fill
                          className="object-cover"
                          sizes="97vw"
                        />
                      ) : (
                        <span className="text-4xl" aria-hidden>📦</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      {card.categoryName && (
                        <p className="text-xs text-slate-400">{card.categoryName}</p>
                      )}
                      <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                        {card.name}
                      </h3>
                      {card.brand && (
                        <p className="mt-1 text-xs text-slate-400">{card.brand}</p>
                      )}
                      <p className="mt-auto pt-2 text-base font-bold text-primary-600">
                        {formatPrice(price)}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Desktop: standard grid ── */}
        <div className="mt-8 hidden sm:grid sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={String(p.id)} product={toProductCard(p)} />
          ))}
        </div>

        {products.length === 0 && (
          <p className="mt-12 text-center text-slate-500">Chưa có sản phẩm trong danh mục này.</p>
        )}
      </section>
    </PublicLayout>
  );
}
