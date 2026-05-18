'use client';

import { useEffect } from 'react';

interface GoogleAdProps {
  slot?: string;
  width?: number;
  height?: number;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function GoogleAd({ slot, width = 728, height = 90, className = '' }: GoogleAdProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const adSlot = slot || process.env.NEXT_PUBLIC_ADSENSE_SLOT;

  useEffect(() => {
    if (!clientId || !adSlot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, [clientId, adSlot]);

  if (!clientId || !adSlot) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 ${className}`}
        style={{ minHeight: height, maxWidth: width }}
      >
        Quảng cáo Google
      </div>
    );
  }

  return (
    <div className={className} style={{ minHeight: height }}>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', width, height }}
        data-ad-client={clientId}
        data-ad-slot={adSlot}
      />
    </div>
  );
}
