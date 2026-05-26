import { apiFetch } from './client';

export type AdPosition =
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'in-content'
  | 'overlay'
  | 'floating';

export type AdType = 'google_ads' | 'static_banner' | 'html_embed';

export interface AdZoneRecord {
  id: string;
  name: string;
  position: AdPosition;
  dimensions: { width: number; height: number; unit: string };
  configuration?: Record<string, unknown>;
  isActive: boolean;
}

export interface Advertisement {
  id: string;
  zoneId: string;
  type: AdType;
  contentUrl?: string;
  scriptCode?: string;
  clickUrl?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

export interface ActiveAdResult {
  zoneId: string;
  position: AdPosition;
  dimensions: { width: number; height: number; unit: string };
  adId: string;
  type: AdType;
  contentUrl?: string;
  scriptCode?: string;
  clickUrl?: string;
}

export async function getAdZones(filters?: {
  isActive?: boolean;
  position?: AdPosition;
}): Promise<AdZoneRecord[]> {
  const data = await apiFetch<AdZoneRecord[]>('/ads/zones', {
    params: {
      isActive: filters?.isActive === false ? 'false' : 'true',
      position: filters?.position,
    },
  });
  return Array.isArray(data) ? data : [];
}

export async function getActiveAd(position: AdPosition): Promise<ActiveAdResult | null> {
  try {
    const data = await apiFetch<ActiveAdResult | null>('/ads/active', {
      params: { position },
      next: { revalidate: 0 },
    } as any);
    return data ?? null;
  } catch {
    return null;
  }
}
