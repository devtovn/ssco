'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { formatPrice } from '@/lib/utils/format';

interface PriceEntry {
  id: string;
  source: string;
  sourceUrl: string;
  affiliateUrl?: string;
  price: number;
  currency: string;
  isAvailable: boolean;
}

interface PricesResult {
  productId: string;
  productSlug: string;
  productName: string;
  prices: PriceEntry[];
}

const SOURCE_ICONS: Record<string, string> = {
  tiki: '🛍️',
  shopee: '🧡',
  lazada: '💙',
  tiktok: '🎵',
};

function redirectUrl(entry: PriceEntry, productSlug: string, deviceName: string): string {
  const dest = entry.affiliateUrl || entry.sourceUrl;
  return `/chuyen-huong?to=${encodeURIComponent(dest)}&source=${entry.source}&pid=${encodeURIComponent(productSlug)}&name=${encodeURIComponent(deviceName)}`;
}

interface GadgetPricePanelProps {
  deviceSlug: string;
  deviceName: string;
}

export function GadgetPricePanel({ deviceSlug, deviceName }: GadgetPricePanelProps) {
  const [data, setData] = useState<PricesResult | null | 'loading'>('loading');

  useEffect(() => {
    apiFetch<PricesResult | null>(`/gadget/devices/${deviceSlug}/prices`)
      .then(setData)
      .catch((err) => { console.error('[GadgetPricePanel]', err); setData(null); });
  }, [deviceSlug]);

  if (data === 'loading') {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-400">Đang tải giá...</p>
      </div>
    );
  }

  if (!data || !data.prices.length) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
        <p className="text-sm text-slate-500">Chưa có dữ liệu giá cho thiết bị này.</p>
        <Link
          href={`/search?q=${encodeURIComponent(deviceName)}`}
          className="mt-2 inline-block text-sm text-primary-600 hover:underline"
        >
          Tìm kiếm "{deviceName}" →
        </Link>
      </div>
    );
  }

  const lowest = data.prices.filter(p => p.isAvailable).sort((a, b) => a.price - b.price)[0];

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Giá trên các sàn</h2>
        <Link
          href={`/san-pham/${data.productSlug}`}
          className="text-sm text-primary-600 hover:underline"
        >
          Xem trang sản phẩm →
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Mobile layout */}
        <div className="divide-y divide-slate-100 sm:hidden">
          {data.prices.map((entry) => {
            const isLowest = entry.id === lowest?.id && entry.isAvailable;
            return (
              <div key={entry.id} className={`p-4 ${isLowest ? 'bg-primary-50/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize text-slate-900">
                    {SOURCE_ICONS[entry.source] ?? '🏪'} {entry.source}
                    {isLowest && (
                      <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Rẻ nhất</span>
                    )}
                  </span>
                  <span className={`text-xs font-medium ${entry.isAvailable ? 'text-green-600' : 'text-slate-400'}`}>
                    {entry.isAvailable ? 'Còn hàng' : 'Hết hàng'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-lg font-bold text-primary-700">{formatPrice(entry.price)}</p>
                  {entry.isAvailable ? (
                    <Link
                      href={redirectUrl(entry, data.productSlug, deviceName)}
                      className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                    >
                      Tới nơi bán →
                    </Link>
                  ) : (
                    <span className="shrink-0 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">Hết hàng</span>
                  )}
                </div>
                <Link
                  href={`/san-pham/${data.productSlug}`}
                  className="mt-2 inline-block text-xs text-primary-600 hover:underline"
                >
                  So sánh giá đầy đủ →
                </Link>
              </div>
            );
          })}
        </div>

        {/* Desktop table layout */}
        <table className="hidden w-full text-left text-sm sm:table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-4 py-3 font-medium">Sàn</th>
              <th className="px-4 py-3 font-medium">Giá</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {data.prices.map((entry) => {
              const isLowest = entry.id === lowest?.id && entry.isAvailable;
              return (
                <tr key={entry.id} className={`border-b border-slate-100 last:border-0 ${isLowest ? 'bg-primary-50/50' : ''}`}>
                  <td className="px-4 py-3 font-medium capitalize text-slate-900">
                    {SOURCE_ICONS[entry.source] ?? '🏪'} {entry.source}
                    {isLowest && (
                      <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Rẻ nhất</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-primary-700">{formatPrice(entry.price)}</td>
                  <td className="px-4 py-3">
                    {entry.isAvailable
                      ? <span className="text-green-600">Còn hàng</span>
                      : <span className="text-slate-400">Hết hàng</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/san-pham/${data.productSlug}`}
                        className="rounded-xl border border-primary-300 bg-white px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                      >
                        So sánh giá
                      </Link>
                      {entry.isAvailable ? (
                        <Link
                          href={redirectUrl(entry, data.productSlug, deviceName)}
                          className="rounded-xl bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
                        >
                          Tới nơi bán →
                        </Link>
                      ) : (
                        <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-400">Hết hàng</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
