'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const list = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const main = list[active];

  const thumbCount = Math.max(list.length, 4);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-100">
        {main ? (
          <div className="relative h-full w-full">
            <Image
              src={main}
              alt={productName}
              fill
              className="object-contain p-4"
              sizes="(max-width: 768px) 100vw, 420px"
              priority
            />
          </div>
        ) : (
          <span className="text-7xl" aria-hidden>📦</span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {Array.from({ length: Math.min(thumbCount, 4) }).map((_, i) => {
          const img = list[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => img && setActive(i)}
              className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-slate-100 ${
                i === active && img ? 'border-primary-400' : 'border-slate-200'
              }`}
            >
              {img ? (
                <div className="relative h-full w-full">
                  <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                </div>
              ) : (
                <span className="text-lg" aria-hidden>📦</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
