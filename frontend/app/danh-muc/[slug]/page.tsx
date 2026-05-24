import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { ProductCard, type ProductCardData } from '@/components/shared/ProductCard';
import { JsonLd } from '@/components/shared/JsonLd';
import { VoucherTabs } from '@/components/home/VoucherTabs';
import { getCategoryBySlug, getCategoryProducts } from '@/lib/api/categories';

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
  try {
    const category = await getCategoryBySlug(params.slug);
    return {
      title: `${category.name} | SSCO`,
      description: category.description || `Sản phẩm danh mục ${category.name} — so sánh giá tốt nhất.`,
    };
  } catch {
    return { title: 'Danh mục | SSCO' };
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
  }).catch(() => ({ products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }));

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

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
