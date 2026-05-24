'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateAffiliateLink, trackClick } from '@/lib/api/products';
import { trackInteraction } from '@/lib/api/analytics';
import { getUserSession } from '@/lib/utils/session';

const SOURCE_LABELS: Record<string, string> = {
  tiki: 'Tiki',
  lazada: 'Lazada',
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
};

const SOURCE_COLORS: Record<string, string> = {
  tiki: 'text-blue-600',
  lazada: 'text-orange-500',
  shopee: 'text-orange-600',
  tiktok: 'text-slate-900',
};

export function ChuyenHuong() {
  const params = useSearchParams();
  const to = params.get('to') || '';
  const source = (params.get('source') || '').toLowerCase();
  const pid = params.get('pid') || '';

  const [destUrl, setDestUrl] = useState('');
  const [error, setError] = useState(false);

  const sourceLabel = SOURCE_LABELS[source] || source;
  const sourceColor = SOURCE_COLORS[source] || 'text-primary-600';

  useEffect(() => {
    if (!to) { setError(true); return; }

    let cancelled = false;

    async function run() {
      let finalUrl = to;

      try {
        const { affiliateLink } = await generateAffiliateLink({
          productUrl: to,
          platformId: source || 'unknown',
        });
        finalUrl = affiliateLink;

        void trackClick({
          platformId: source,
          generatedLink: finalUrl,
          productId: pid,
          userSession: getUserSession(),
          userAgent: navigator.userAgent,
          referrer: document.referrer || undefined,
        });

        void trackInteraction({
          eventType: 'click',
          productId: pid,
          targetUrl: finalUrl,
          pagePath: window.location.pathname,
          userSession: getUserSession(),
        });
      } catch {
        // affiliate generation failed — fall back to raw URL
      }

      if (!cancelled) {
        setDestUrl(finalUrl);
        setTimeout(() => {
          if (!cancelled) window.location.href = finalUrl;
        }, 1800);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [to, source, pid]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Đường dẫn không hợp lệ.</p>
          <a href="/" className="mt-4 inline-block text-sm text-primary-600 hover:text-primary-700">
            Về trang chủ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50">
            <svg
              className="h-7 w-7 animate-spin text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </span>
        </div>

        <p className="text-base font-semibold text-slate-900">Đang chuyển đến nơi bán</p>
        <p className="mt-1 text-sm text-slate-500">
          Bạn sẽ được đưa đến{' '}
          <span className={`font-semibold ${sourceColor}`}>{sourceLabel}</span>
        </p>

        <p className="mt-6 text-xs text-slate-400">
          Không tự chuyển?{' '}
          {destUrl ? (
            <a
              href={destUrl}
              className="font-medium text-primary-600 underline-offset-2 hover:text-primary-700 hover:underline"
            >
              Nhấn vào đây
            </a>
          ) : (
            <span className="text-slate-300">Đang tải…</span>
          )}
        </p>
      </div>
    </div>
  );
}
