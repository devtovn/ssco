'use client';

import { useState } from 'react';
import type { PriceComparison, PriceHistory } from '@price-comparison/types';
import { PriceComparisonTable } from './PriceComparisonTable';
import { PriceHistoryChart } from './PriceHistoryChart';
import { SpecsTable } from '@/components/gadget/SpecsTable';
import type { GadgetSpecs } from '@/lib/api/gadget';

interface ProductDetailTabsProps {
  comparison: PriceComparison;
  history: PriceHistory;
  productId: string;
  gadgetSpecs?: GadgetSpecs;
  gadgetSlug?: string;
}

export function ProductDetailTabs({ comparison, history, productId, gadgetSpecs, gadgetSlug }: ProductDetailTabsProps) {
  const [tab, setTab] = useState<'price' | 'specs'>('price');

  const tabs = [
    { id: 'price' as const, label: 'So sánh giá', count: comparison.prices.length },
    { id: 'specs' as const, label: 'Thông số kỹ thuật' },
  ];

  return (
    <>
      <div role="tablist" className="flex gap-0 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                active
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'price' && (
        <div className="mt-6 space-y-8">
          <PriceComparisonTable
            comparison={comparison}
            productId={productId}
            productName={comparison.productName}
            productImage={comparison.prices.map(p => p.metadata?.image as string | undefined).find(Boolean)}
          />
          <PriceHistoryChart history={history} />
        </div>
      )}

      {tab === 'specs' && (
        <div className="mt-6">
          {gadgetSpecs && Object.keys(gadgetSpecs).length > 0 ? (
            <div>
              {gadgetSlug && (
                <p className="mb-4 text-xs text-slate-500">
                  Nguồn thông số:{' '}
                  <a href={`/gadget/${gadgetSlug}`} className="text-primary-600 hover:underline">
                    Xem trang cấu hình đầy đủ →
                  </a>
                </p>
              )}
              <SpecsTable specs={gadgetSpecs} />
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
              Chưa có thông số kỹ thuật cho sản phẩm này.
            </p>
          )}
        </div>
      )}
    </>
  );
}
