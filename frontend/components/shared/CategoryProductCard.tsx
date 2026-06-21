import Image from 'next/image';
import Link from 'next/link';
import { PlatformLogos } from '@/components/shared/PlatformLogos';
import { getPlatformLabel } from '@/lib/platforms';
import { formatPrice } from '@/lib/utils/format';

export interface CategoryProductCardData {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  brand?: string;
  lowestPrice?: number;
  lowestSource?: string;
  sourceCount?: number;
  sources?: string[];
}

interface CategoryProductCardProps {
  product: CategoryProductCardData;
  className?: string;
}

export function CategoryProductCard({ product, className = '' }: CategoryProductCardProps) {
  const sourceCount = product.sourceCount ?? product.sources?.length ?? 0;
  const lowestLabel = getPlatformLabel(product.lowestSource);

  return (
    <Link
      href={`/san-pham/${product.slug ?? product.id}`}
      className={`group flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-primary-300 hover:shadow-md sm:gap-4 sm:p-4 ${className}`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 96px, 112px"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-3xl" aria-hidden>
            📦
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-snug text-slate-900 group-hover:text-primary-700 sm:text-[15px]">
          {product.name}
        </h3>
        {product.brand && <p className="mt-1 text-xs text-slate-400">{product.brand}</p>}
        <p className="mt-2 text-lg font-bold text-primary-600">{formatPrice(product.lowestPrice)}</p>

        {sourceCount > 0 && (
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <PlatformLogos sources={product.sources} />
            <span className="shrink-0 text-xs text-slate-500">
              {sourceCount} nơi bán
            </span>
          </div>
        )}

        {lowestLabel && sourceCount > 0 && (
          <p className="mt-1.5 text-xs text-green-700">
            <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium ring-1 ring-green-100">
              Rẻ nhất
            </span>
            <span className="ml-1">trên {lowestLabel}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
