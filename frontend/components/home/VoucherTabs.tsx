'use client';

import { useState } from 'react';
import { useSiteConfig } from '@/context/SiteConfigContext';

const VOUCHERS = {
  tiki: [
    { code: 'TIKIBACK10', desc: 'Hoàn 10% tối đa 100k cho đơn từ 500k', expires: '31/05/2026', type: 'cashback' as const },
    { code: 'FREESHIP99', desc: 'Miễn phí vận chuyển toàn quốc', expires: '30/05/2026', type: 'shipping' as const },
    { code: 'DEAL15OFF', desc: 'Giảm 15% tối đa 200k cho Điện thoại', expires: '25/05/2026', type: 'discount' as const },
  ],
  lazada: [
    { code: 'LAZSAVE50K', desc: 'Giảm 50k cho đơn từ 500k', expires: '28/05/2026', type: 'discount' as const },
    { code: 'LAZFS0', desc: 'Freeship không giới hạn', expires: '31/05/2026', type: 'shipping' as const },
  ],
  shopee: [
    { code: 'SPBACK15', desc: 'Hoàn xu 15% tối đa 150k', expires: '29/05/2026', type: 'cashback' as const },
    { code: 'SPSAVE200', desc: 'Giảm 200k cho đơn từ 1 triệu', expires: '26/05/2026', type: 'discount' as const },
  ],
  tiktok: [
    { code: 'TTKNEW30', desc: 'Giảm 30% cho lần đầu mua trên TikTok Shop', expires: '31/05/2026', type: 'discount' as const },
  ],
};

const VOUCHER_COLORS = {
  cashback: { badge: 'bg-amber-100 text-amber-800', label: 'Hoàn tiền' },
  shipping: { badge: 'bg-green-100 text-green-800', label: 'Freeship' },
  discount: { badge: 'bg-primary-100 text-primary-800', label: 'Giảm giá' },
};

const TABS = [
  { key: 'tiki' as const, label: 'Tiki' },
  { key: 'shopee' as const, label: 'Shopee' },
  { key: 'tiktok' as const, label: 'TikTok Shop' },
  { key: 'lazada' as const, label: 'Lazada' },
];

type TabKey = keyof typeof VOUCHERS;

interface VoucherTabsProps {
  className?: string;
  featured?: boolean;
}

export function VoucherTabs({ className = '', featured = false }: VoucherTabsProps) {
  const { siteName } = useSiteConfig();
  const [active, setActive] = useState<TabKey>('tiki');
  const [copied, setCopied] = useState<string | null>(null);
  const vouchers = VOUCHERS[active] || [];

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
          {TABS.map(({ key, label }) => {
            const isActive = active === key;
            const count = VOUCHERS[key]?.length ?? 0;
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
                  {/* Mobile: 2-row layout */}
                  <div className="px-3 pb-2.5 pt-3 sm:hidden">
                    <p className="text-sm font-medium text-slate-800">{v.desc}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                      <span className="text-xs text-slate-400">HSD: {v.expires}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <code className="rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-xs font-bold tracking-wider text-slate-800">
                          {v.code}
                        </code>
                        <button
                          onClick={() => copy(v.code)}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${isCopied ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-primary-600 hover:text-white'}`}
                        >
                          {isCopied ? '✓' : 'Sao'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop: single-row layout */}
                  <div className="hidden items-center gap-4 px-5 py-4 sm:flex">
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{v.desc}</p>
                      <p className="mt-0.5 text-xs text-slate-400">HSD: {v.expires}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <code className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-bold tracking-widest text-slate-800">
                        {v.code}
                      </code>
                      <button
                        onClick={() => copy(v.code)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isCopied ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-primary-600 hover:text-white'}`}
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
