'use client';

import { useState } from 'react';
import type { PriceComparison, PriceEntry } from '@price-comparison/types';
import { formatPrice } from '@/lib/utils/format';
import { generateAffiliateLink, trackClick } from '@/lib/api/products';
import { getUserSession } from '@/lib/utils/session';
import { trackInteraction } from '@/lib/api/analytics';

const PLATFORM_IDS: Record<string, string> = {
  tiki: 'tiki',
  lazada: 'lazada',
  shopee: 'shopee',
  tiktok: 'tiktok',
};

interface PriceComparisonTableProps {
  comparison: PriceComparison;
  productId: string;
}

export function PriceComparisonTable({ comparison, productId }: PriceComparisonTableProps) {
  const [loadingSource, setLoadingSource] = useState<string | null>(null);

  const handleBuy = async (entry: PriceEntry) => {
    const platformId = PLATFORM_IDS[entry.source.toLowerCase()] || entry.source.toLowerCase();
    setLoadingSource(entry.source);

    try {
      const { affiliateLink } = await generateAffiliateLink({
        productUrl: entry.sourceUrl,
        platformId,
      });

      await trackClick({
        platformId,
        generatedLink: affiliateLink,
        productId,
        userSession: getUserSession(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || undefined,
      });

      void trackInteraction({
        eventType: 'click',
        productId,
        targetUrl: affiliateLink,
        pagePath: `/san-pham/${productId}`,
        userSession: getUserSession(),
      });

      window.open(affiliateLink, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(entry.sourceUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setLoadingSource(null);
    }
  };

  if (!comparison.prices.length) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
        Chưa có dữ liệu giá cho sản phẩm này.
      </p>
    );
  }

  const lowestId = comparison.lowestPrice?.id;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <th className="px-4 py-3 font-medium">Nguồn</th>
            <th className="px-4 py-3 font-medium">Giá</th>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {comparison.prices.map((entry) => {
            const isLowest = entry.id === lowestId && entry.isAvailable;
            return (
              <tr
                key={entry.id}
                className={`border-b border-slate-100 last:border-0 ${isLowest ? 'bg-primary-50/50' : ''}`}
              >
                <td className="px-4 py-3 font-medium capitalize text-slate-900">
                  {entry.source}
                  {isLowest && (
                    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Rẻ nhất
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-bold text-primary-700">
                  {formatPrice(entry.price)}
                </td>
                <td className="px-4 py-3">
                  {entry.isAvailable ? (
                    <span className="text-green-600">Còn hàng</span>
                  ) : (
                    <span className="text-slate-400">Hết hàng</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={!entry.isAvailable || loadingSource === entry.source}
                    onClick={() => handleBuy(entry)}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                  >
                    {loadingSource === entry.source ? 'Đang xử lý…' : 'Mua ngay'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {comparison.lastUpdated && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          Cập nhật: {new Date(comparison.lastUpdated).toLocaleString('vi-VN')}
        </p>
      )}
    </div>
  );
}
