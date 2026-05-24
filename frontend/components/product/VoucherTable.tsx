'use client';

import { useState } from 'react';

const VOUCHERS: Record<string, { code: string; desc: string; expires: string; type: 'cashback' | 'shipping' | 'discount' }[]> = {
  tiki: [
    { code: 'TIKIBACK10', desc: 'Hoàn 10% tối đa 100k cho đơn từ 500k', expires: '31/05/2026', type: 'cashback' },
    { code: 'FREESHIP99', desc: 'Miễn phí vận chuyển toàn quốc', expires: '30/05/2026', type: 'shipping' },
    { code: 'DEAL15OFF', desc: 'Giảm 15% tối đa 200k cho Điện thoại', expires: '25/05/2026', type: 'discount' },
  ],
  lazada: [
    { code: 'LAZSAVE50K', desc: 'Giảm 50k cho đơn từ 500k', expires: '28/05/2026', type: 'discount' },
    { code: 'LAZFS0', desc: 'Freeship không giới hạn', expires: '31/05/2026', type: 'shipping' },
  ],
  shopee: [
    { code: 'SPBACK15', desc: 'Hoàn xu 15% tối đa 150k', expires: '29/05/2026', type: 'cashback' },
    { code: 'SPSAVE200', desc: 'Giảm 200k cho đơn từ 1 triệu', expires: '26/05/2026', type: 'discount' },
  ],
  tiktok: [
    { code: 'TTKNEW30', desc: 'Giảm 30% cho lần đầu mua trên TikTok Shop', expires: '31/05/2026', type: 'discount' },
  ],
};

const VOUCHER_COLORS = {
  cashback: { badge: 'bg-amber-100 text-amber-800', label: 'Hoàn tiền' },
  shipping: { badge: 'bg-green-100 text-green-800', label: 'Freeship' },
  discount: { badge: 'bg-primary-100 text-primary-800', label: 'Giảm giá' },
};

interface VoucherTableProps {
  source: string;
}

export function VoucherTable({ source }: VoucherTableProps) {
  const key = source.toLowerCase().replace(/\s+/g, '').replace('tiktokshop', 'tiktok');
  const vouchers = VOUCHERS[key] || VOUCHERS['tiki'];
  const [copied, setCopied] = useState<string | null>(null);

  function copy(code: string) {
    try { navigator.clipboard.writeText(code); } catch {}
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Mã giảm giá</h3>
        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
          {source}
        </span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {vouchers.map((v, i) => {
            const c = VOUCHER_COLORS[v.type];
            const isCopied = copied === v.code;
            return (
              <tr key={v.code} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                <td className="w-px px-3 py-2.5">
                  <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                </td>
                <td className="px-2 py-2.5 leading-snug text-slate-700">{v.desc}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-slate-400">{v.expires}</td>
                <td className="w-px px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <code className="whitespace-nowrap rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 font-mono font-bold tracking-wide text-slate-800">
                      {v.code}
                    </code>
                    <button
                      onClick={() => copy(v.code)}
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold transition ${isCopied ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
                    >
                      {isCopied ? '✓' : 'Copy'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400">
        Voucher do {source} cung cấp. SSCO không đảm bảo tính khả dụng.
      </p>
    </div>
  );
}
