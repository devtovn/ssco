import { ProductCard, type ProductCardData } from '@/components/shared/ProductCard';

interface RelatedProductsProps {
  products: ProductCardData[];
  title?: string;
}

export function RelatedProducts({
  products,
  title = 'Sản phẩm liên quan',
}: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="w-64 shrink-0 md:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
