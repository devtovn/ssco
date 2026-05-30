'use client';

import { useState, useEffect } from 'react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { fetchVouchers, type Voucher } from '@/lib/api/vouchers';

const VOUCHER_COLORS = {
  cashback: { badge: 'bg-amber-100 text-amber-800', label: 'Hoàn tiền' },
  shipping:  { badge: 'bg-green-100 text-green-800', label: 'Freeship' },
  discount:  { badge: 'bg-primary-100 text-primary-800', label: 'Giảm giá' },
};

interface VoucherTableProps {
  source: string;
  isLowest?: boolean;
}

export function VoucherTable({ source, isLowest = false }: VoucherTableProps) {
  const { siteName } = useSiteConfig();
  const key = source.toLowerCase().replace(/\s+/g, '').replace('tiktokshop', 'tiktok');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchVouchers(key).then((data) => {
      setVouchers(data);
      setReady(true);
    });
  }, [key]);

  if (!ready || vouchers.length === 0) return null;

  function copy(code: string) {
    try { navigator.clipboard.writeText(code); } catch {}
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Mã giảm giá</h3>
        <div className="flex items-center gap-2">
          {isLowest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 ring-1 ring-green-300">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Giá thấp nhất
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${isLowest ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 bg-white text-slate-600'}`}>
            {source}
          </span>
        </div>
      </div>

      <div>
        {vouchers.map((v, i) => {
          const c = VOUCHER_COLORS[v.type];
          const isCopied = copied === v.code;
          const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';

          return (
            <div key={v.code} className={`border-b border-slate-100 last:border-0 ${rowBg}`}>
              {/* Mobile: 3-row layout */}
              <div className="px-3 pb-2.5 pt-3 sm:hidden">
                <p className="text-sm font-medium text-slate-700">{v.description}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                  <span className="text-xs text-slate-400">HSD: {v.expires}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <code className="rounded border border-dashed border-slate-300 bg-white px-2 py-0.5 text-xs font-bold tracking-wider text-slate-800">
                    {v.code}
                  </code>
                  <button
                    onClick={() => copy(v.code)}
                    className={`inline-flex w-12 shrink-0 items-center justify-center rounded-md py-0.5 text-xs font-semibold transition ${isCopied ? 'bg-green-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                  >
                    {isCopied ? '✓ OK' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Desktop: single-row table layout */}
              <div className="hidden items-center gap-2 px-3 py-2.5 sm:flex">
                <span className={`shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                <span className="min-w-0 flex-1 px-1 text-xs leading-snug text-slate-700">{v.description}</span>
                <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{v.expires}</span>
                <div className="ml-2 flex shrink-0 items-center gap-1.5">
                  <code className="whitespace-nowrap rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs font-bold tracking-wide text-slate-800">
                    {v.code}
                  </code>
                  <button
                    onClick={() => copy(v.code)}
                    className={`inline-flex w-12 shrink-0 items-center justify-center rounded-md py-0.5 text-xs font-semibold transition ${isCopied ? 'bg-green-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                  >
                    {isCopied ? '✓ OK' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400">
        Voucher do <span className="font-bold capitalize text-slate-600">{source}</span> cung cấp. {siteName} không đảm bảo tính khả dụng.
      </p>
    </div>
  );
}
