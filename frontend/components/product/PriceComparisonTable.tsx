'use client';

import Link from 'next/link';
import type { PriceComparison, PriceEntry } from '@price-comparison/types';
import { formatPrice, formatDateTime } from '@/lib/utils/format';

interface PriceComparisonTableProps {
  comparison: PriceComparison;
  productId: string;
  productName?: string;
  productImage?: string;
}

function redirectUrl(entry: PriceEntry, productId: string, productName?: string, productImage?: string): string {
  const source = entry.source.toLowerCase();
  // Use pre-generated affiliate URL if available; fall back to raw sourceUrl
  const dest = entry.affiliateUrl || entry.sourceUrl;
  let url = `/chuyen-huong?to=${encodeURIComponent(dest)}&source=${source}&pid=${encodeURIComponent(productId)}`;
  if (productName) url += `&name=${encodeURIComponent(productName)}`;
  if (productImage) url += `&img=${encodeURIComponent(productImage)}`;
  return url;
}

export function PriceComparisonTable({ comparison, productId, productName, productImage }: PriceComparisonTableProps) {
  if (!comparison.prices.length) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
        Chưa có dữ liệu giá cho sản phẩm này.
      </p>
    );
  }

  const lowestId = comparison.lowestPrice?.id;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Mobile card layout */}
      <div className="divide-y divide-slate-100 sm:hidden">
        {comparison.prices.map((entry) => {
          const isLowest = entry.id === lowestId && entry.isAvailable;
          return (
            <div key={entry.id} className={`p-4 ${isLowest ? 'bg-primary-50/50' : ''}`}>
              {/* Row 1: source name + còn hàng */}
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize text-slate-900">
                  {entry.source}
                  {isLowest && (
                    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Rẻ nhất
                    </span>
                  )}
                </span>
                <span className={`text-xs font-medium ${entry.isAvailable ? 'text-green-600' : 'text-slate-400'}`}>
                  {entry.isAvailable ? 'Còn hàng' : 'Hết hàng'}
                </span>
              </div>
              {/* Row 2: giá (trái) + nút tới nơi bán (phải) */}
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-lg font-bold text-primary-700">{formatPrice(entry.price)}</p>
                {entry.isAvailable ? (
                  <Link
                    href={redirectUrl(entry, productId, productName, productImage)}
                    className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                  >
                    Tới nơi bán →
                  </Link>
                ) : (
                  <span className="shrink-0 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                    Hết hàng
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
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
                  <td className="px-4 py-3 font-bold text-primary-700">{formatPrice(entry.price)}</td>
                  <td className="px-4 py-3">
                    {entry.isAvailable ? (
                      <span className="text-green-600">Còn hàng</span>
                    ) : (
                      <span className="text-slate-400">Hết hàng</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {entry.isAvailable ? (
                      <Link
                        href={redirectUrl(entry, productId, productName, productImage)}
                        className="inline-block rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                      >
                        Tới nơi bán
                      </Link>
                    ) : (
                      <span className="inline-block rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
                        Hết hàng
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {comparison.lastUpdated && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          Cập nhật: {formatDateTime(comparison.lastUpdated)}
        </p>
      )}
    </div>
  );
}
