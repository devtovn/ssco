'use client';

import { useState, useEffect } from 'react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { fetchVouchers, type Voucher, type VoucherSource } from '@/lib/api/vouchers';

const VOUCHER_COLORS = {
  cashback: { badge: 'bg-amber-100 text-amber-800', label: 'Hoàn tiền' },
  shipping:  { badge: 'bg-green-100 text-green-800', label: 'Freeship' },
  discount:  { badge: 'bg-primary-100 text-primary-800', label: 'Giảm giá' },
};

const ALL_TABS: { key: VoucherSource; label: string }[] = [
  { key: 'tiki',   label: 'Tiki' },
  { key: 'shopee', label: 'Shopee' },
  { key: 'tiktok', label: 'TikTok Shop' },
  { key: 'lazada', label: 'Lazada' },
];

interface VoucherTabsProps {
  className?: string;
  featured?: boolean;
}

export function VoucherTabs({ className = '', featured = false }: VoucherTabsProps) {
  const { siteName } = useSiteConfig();
  const [copied, setCopied] = useState<string | null>(null);
  const [allVouchers, setAllVouchers] = useState<Voucher[]>([]);
  const [active, setActive] = useState<VoucherSource>('tiki');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchVouchers().then((data) => {
      setAllVouchers(data);
      // Set active to first tab that has vouchers
      const first = ALL_TABS.find((t) => data.some((v) => v.source === t.key));
      if (first) setActive(first.key);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  const validTabs = ALL_TABS.filter((t) => allVouchers.some((v) => v.source === t.key));
  if (validTabs.length === 0) return null;

  const vouchers = allVouchers.filter((v) => v.source === active);

  function copy(code: string) {
    try { navigator.clipboard.writeText(code); } catch {}
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {featured ? (
            <>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">🏷️ Mã giảm giá hôm nay</h2>
              <p className="mt-1 text-sm text-slate-500">Voucher từ các sàn TMĐT lớn — cập nhật hàng ngày, dùng ngay khi mua</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">Mã giảm giá</h2>
              <p className="mt-1 text-sm text-slate-500">Voucher từ các sàn thương mại điện tử</p>
            </>
          )}
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${featured ? 'border-primary-200 shadow-md ring-1 ring-primary-100' : 'border-slate-200'}`}>
        {featured && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-3 py-2.5 sm:px-5 sm:py-3">
            <p className="text-sm font-semibold text-white">Sao chép mã → Dán khi thanh toán để được giảm giá ngay!</p>
          </div>
        )}

        <div className="flex overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
          {validTabs.map(({ key, label }) => {
            const isActive = active === key;
            const count = allVouchers.filter((v) => v.source === key).length;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-5 sm:py-3.5 ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${isActive ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div>
          {vouchers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Chưa có mã giảm giá cho sàn này.</p>
          ) : (
            vouchers.map((v, idx) => {
              const c = VOUCHER_COLORS[v.type];
              const isCopied = copied === v.code;
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70';
              return (
                <div key={v.code} className={`border-b border-slate-100 last:border-0 ${rowBg}`}>
                  {/* Mobile: 3-row layout */}
                  <div className="px-3 pb-2.5 pt-3 sm:hidden">
                    <p className="text-sm font-medium text-slate-800">{v.description}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                      <span className="text-xs text-slate-400">HSD: {v.expires}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-xs font-bold tracking-wider text-slate-800">
                        {v.code}
                      </code>
                      <button
                        onClick={() => copy(v.code)}
                        className={`inline-flex w-12 shrink-0 items-center justify-center rounded-md py-1 text-xs font-semibold transition ${isCopied ? 'bg-green-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                      >
                        {isCopied ? '✓ OK' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Desktop: single-row layout */}
                  <div className="hidden items-center gap-4 px-5 py-4 sm:flex">
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{v.description}</p>
                      <p className="mt-0.5 text-xs text-slate-400">HSD: {v.expires}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <code className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-bold tracking-widest text-slate-800">
                        {v.code}
                      </code>
                      <button
                        onClick={() => copy(v.code)}
                        className={`inline-flex w-20 shrink-0 items-center justify-center rounded-lg py-1.5 text-xs font-semibold transition ${isCopied ? 'bg-green-500 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                      >
                        {isCopied ? '✓ Đã sao' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="border-t border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-400 sm:px-5">
          Voucher được cung cấp bởi các sàn thương mại điện tử. {siteName} không đảm bảo tính khả dụng của voucher.
        </p>
      </div>
    </section>
  );
}
