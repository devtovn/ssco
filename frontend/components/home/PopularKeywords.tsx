'use client';

import { useRouter } from 'next/navigation';
import type { PopularKeyword } from '@price-comparison/types';

interface PopularKeywordsProps {
  keywords: PopularKeyword[];
}

export function PopularKeywords({ keywords }: PopularKeywordsProps) {
  const router = useRouter();

  if (keywords.length === 0) return null;

  return (
    <section className="mt-6">
      <p className="mb-3 text-center text-sm font-medium text-slate-600">Từ khóa phổ biến</p>
      <div className="flex flex-wrap justify-center gap-2">
        {keywords.map((item) => (
          <button
            key={item.keyword}
            type="button"
            onClick={() => router.push(`/search?q=${encodeURIComponent(item.keyword)}`)}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
          >
            {item.keyword}
          </button>
        ))}
      </div>
    </section>
  );
}
