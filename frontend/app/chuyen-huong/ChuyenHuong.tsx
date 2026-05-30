'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { generateAffiliateLink, trackClick } from '@/lib/api/products';
import { trackInteraction } from '@/lib/api/analytics';
import { getUserSession } from '@/lib/utils/session';
import { useSiteConfig } from '@/context/SiteConfigContext';

const SOURCE_LABELS: Record<string, string> = {
  tiki: 'Tiki',
  lazada: 'Lazada',
  shopee: 'Shopee',
  tiktok: 'TikTok Shop',
};

const COUNTDOWN_SECONDS = 5;
const CIRCUMFERENCE = 2 * Math.PI * 28;

export function ChuyenHuong() {
  const params = useSearchParams();
  const router = useRouter();
  const { siteName } = useSiteConfig();

  const to = params.get('to') || '';
  const source = (params.get('source') || '').toLowerCase();
  const pid = params.get('pid') || '';
  const productName = params.get('name') || '';
  const productImage = params.get('img') || '';

  const [destUrl, setDestUrl] = useState('');
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);

  const sourceLabel = SOURCE_LABELS[source] || source || 'nơi bán';
  const sourceInitial = sourceLabel.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!to) { setError(true); return; }

    let cancelled = false;

    async function run() {
      let finalUrl = to;
      try {
        // If `to` is already a pre-generated affiliate link (stored at seed time),
        // skip the runtime generateAffiliateLink call — just use it directly.
        // Detection: affiliate links for known platforms have distinct patterns.
        const isPreGeneratedAffiliate =
          to.includes('s.shopee.vn') ||
          to.includes('shope.ee') ||
          to.includes('c.lazada.vn') ||
          (to.includes('tiki.vn') && to.includes('ref='));

        if (!isPreGeneratedAffiliate) {
          // Fallback: try to generate affiliate link at runtime (Tiki only works reliably)
          const { affiliateLink } = await generateAffiliateLink({
            productUrl: to,
            platformId: source || 'unknown',
          });
          finalUrl = affiliateLink;
        }

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

      if (!cancelled) setDestUrl(finalUrl);
    }

    run();
    return () => { cancelled = true; };
  }, [to, source, pid]);

  // Countdown timer — runs independently; redirects when it hits 0
  useEffect(() => {
    if (paused) return;
    if (seconds <= 0) {
      const url = destUrl || to;
      if (url) window.location.href = url;
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, paused, destUrl, to]);

  function goNow() {
    setPaused(true);
    const url = destUrl || to;
    if (url) window.location.href = url;
  }

  function goBack() {
    if (pid) router.push(`/san-pham/${pid}`);
    else router.back();
  }

  // elapsed fraction — ring fills as time elapses
  const elapsed = (COUNTDOWN_SECONDS - seconds) / COUNTDOWN_SECONDS;

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
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <button
          onClick={goBack}
          className="text-sm text-slate-500 hover:text-primary-700"
        >
          ← Quay lại sản phẩm
        </button>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-lg font-bold uppercase text-primary-700">
              {sourceInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Chuẩn bị chuyển trang
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">
                Bạn đang rời {siteName} sang{' '}
                <span className="text-primary-700">{sourceLabel}</span>
              </h1>
              {productName && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{productName}</p>
              )}
            </div>
          </div>

          {/* Product image */}
          <div className="mt-5 flex items-center justify-center">
            <div className="flex aspect-square w-40 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {productImage ? (
                <Image
                  src={productImage}
                  alt={productName || 'Sản phẩm'}
                  width={160}
                  height={160}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-5xl" aria-hidden>📦</span>
              )}
            </div>
          </div>

          {/* Countdown ring */}
          <div className="mt-6 flex items-center justify-center">
            <div className="relative">
              <svg width="80" height="80" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke="#0284c7" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - elapsed)}
                  transform="rotate(-90 32 32)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{seconds}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-slate-600">
            Tự động chuyển sau <b>{seconds}</b> giây… hoặc chọn bên dưới.
          </p>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={goBack}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-1"
            >
              Quay về {siteName}
            </button>
            <button
              onClick={goNow}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 sm:flex-1"
            >
              Đi ngay tới {sourceLabel} →
            </button>
          </div>

          <p className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            {siteName} có thể nhận hoa hồng nếu bạn đặt mua sau khi click. Giá bạn trả không thay đổi.
          </p>
        </div>
      </div>
    </div>
  );
}
