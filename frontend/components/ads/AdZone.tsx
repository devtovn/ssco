'use client';

import { useEffect, useRef, useState } from 'react';
import { getActiveAd, type AdPosition, type ActiveAdResult } from '@/lib/api/ads';
import { BannerAd } from './BannerAd';

interface AdZoneProps {
  position: AdPosition;
  className?: string;
}

function ScriptAd({ scriptCode, width, height }: { scriptCode: string; width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = scriptCode;
    const scripts = Array.from(wrapper.querySelectorAll('script'));
    const nonScripts = Array.from(wrapper.childNodes).filter((n) => n.nodeName !== 'SCRIPT');
    nonScripts.forEach((n) => ref.current!.appendChild(n.cloneNode(true)));
    scripts.forEach((s) => {
      const el = document.createElement('script');
      if (s.src) el.src = s.src;
      if (s.async) el.async = true;
      if (s.crossOrigin) el.crossOrigin = s.crossOrigin;
      el.textContent = s.textContent;
      ref.current!.appendChild(el);
    });
  }, [scriptCode]);
  return <div ref={ref} style={{ minHeight: height, maxWidth: width }} />;
}

export function AdZone({ position, className = '' }: AdZoneProps) {
  const [ad, setAd] = useState<ActiveAdResult | null | undefined>(undefined);

  useEffect(() => {
    getActiveAd(position).then(setAd).catch(() => setAd(null));
  }, [position]);

  if (ad === undefined || ad === null) return null;

  const width = ad.dimensions?.width ?? (position === 'sidebar' ? 300 : 728);
  const height = ad.dimensions?.height ?? (position === 'sidebar' ? 250 : 90);

  return (
    <section className={className} aria-label="Quảng cáo" data-ad-zone={ad.zoneId} style={{ minHeight: height }}>
      {(ad.type === 'html_embed' || ad.type === 'google_ads') && ad.scriptCode ? (
        <ScriptAd scriptCode={ad.scriptCode} width={width} height={height} />
      ) : (
        <BannerAd imageUrl={ad.contentUrl} clickUrl={ad.clickUrl} width={width} height={height} />
      )}
    </section>
  );
}
