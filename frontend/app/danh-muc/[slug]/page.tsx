import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { ProductCard, type ProductCardData } from '@/components/shared/ProductCard';
import { JsonLd } from '@/components/shared/JsonLd';
import { getCategoryBySlug, getCategoryProducts } from '@/lib/api/categories';

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
  name: string;
  brand?: string;
  images?: string[] | string;
  lowest_price?: number;
}): ProductCardData {
  return {
    id: String(row.id),
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

  return (
    <PublicLayout>
      <JsonLd data={jsonLd} />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Trang chủ', href: '/' },
            { label: category.name },
          ]}
        />
        <h1 className="text-3xl font-bold text-slate-900">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-slate-600">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-slate-500">{pagination.total} sản phẩm</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
