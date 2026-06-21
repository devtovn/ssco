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

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
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

      {list.length > 1 && (
        <div className="mt-4 flex gap-2">
          {list.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-slate-100 sm:h-16 sm:w-16 ${
                i === active ? 'border-primary-400' : 'border-slate-200'
              }`}
            >
              <div className="relative h-full w-full">
                <Image src={img} alt="" fill className="object-cover" sizes="64px" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
