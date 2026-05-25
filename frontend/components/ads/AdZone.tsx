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

  if (!zone) return null;

  const width = zone.dimensions?.width ?? (position === 'sidebar' ? 300 : 728);
  const height = zone.dimensions?.height ?? (position === 'sidebar' ? 250 : 90);
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
