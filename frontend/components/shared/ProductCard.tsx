import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils/format';

export interface ProductCardData {
  id: string;
  name: string;
  image?: string;
  categoryName?: string;
  lowestPrice?: number;
  priceMin?: number;
  brand?: string;
}

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
}

export function ProductCard({ product, className = '' }: ProductCardProps) {
  const price = product.lowestPrice ?? product.priceMin;

  return (
    <Link
      href={`/san-pham/${product.id}`}
      className={`flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${className}`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-2xl" aria-hidden>
            📦
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 font-semibold text-slate-900">{product.name}</h2>
        {product.categoryName && (
          <p className="mt-1 text-sm text-slate-500">{product.categoryName}</p>
        )}
        {product.brand && <p className="mt-0.5 text-xs text-slate-400">{product.brand}</p>}
        <p className="mt-2 font-bold text-primary-600">{formatPrice(price)}</p>
      </div>
    </Link>
  );
}
