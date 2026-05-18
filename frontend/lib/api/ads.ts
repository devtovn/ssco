import { apiFetch } from './client';

export type AdPosition =
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'in-content'
  | 'overlay'
  | 'floating';

export interface AdZoneRecord {
  id: string;
  name: string;
  position: AdPosition;
  dimensions: { width: number; height: number; unit: string };
  configuration?: Record<string, unknown>;
  isActive: boolean;
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
