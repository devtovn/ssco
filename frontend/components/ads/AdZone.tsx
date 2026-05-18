'use client';

import { useEffect, useState } from 'react';
import { getAdZones, type AdPosition, type AdZoneRecord } from '@/lib/api/ads';
import { GoogleAd } from './GoogleAd';
import { BannerAd } from './BannerAd';

interface AdZoneProps {
  position: AdPosition;
  className?: string;
}

export function AdZone({ position, className = '' }: AdZoneProps) {
  const [zone, setZone] = useState<AdZoneRecord | null>(null);

  useEffect(() => {
    getAdZones({ isActive: true, position })
      .then((zones) => setZone(zones[0] ?? null))
      .catch(() => setZone(null));
  }, [position]);

  const width = zone?.dimensions?.width ?? (position === 'sidebar' ? 300 : 728);
  const height = zone?.dimensions?.height ?? (position === 'sidebar' ? 250 : 90);

  if (!zone) {
    return (
      <section
        className={`flex items-center justify-center ${className}`}
        aria-label={`Khu vực quảng cáo ${position}`}
      >
        <GoogleAd width={width} height={height} />
      </section>
    );
  }

  const isGoogle = zone.name.toLowerCase().includes('google');

  return (
    <section
      className={className}
      aria-label={zone.name}
      data-ad-zone={zone.id}
      style={{ minHeight: height }}
    >
      {isGoogle ? (
        <GoogleAd width={width} height={height} />
      ) : (
        <BannerAd width={width} height={height} />
      )}
    </section>
  );
}
