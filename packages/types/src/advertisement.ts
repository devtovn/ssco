/**
 * Advertisement domain types
 */

export type AdPosition = 'header' | 'footer' | 'sidebar' | 'in-content' | 'overlay' | 'floating';
export type AdType = 'google_ads' | 'banner' | 'video' | 'native';

export interface AdZone {
  id: number;
  name: string;
  position: AdPosition;
  width?: number;
  height?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdZoneInput {
  name: string;
  position: AdPosition;
  width?: number;
  height?: number;
}

export interface AdZoneUpdate {
  name?: string;
  position?: AdPosition;
  width?: number;
  height?: number;
  isActive?: boolean;
}

export interface Advertisement {
  id: number;
  zoneId: number;
  type: AdType;
  name: string;
  contentUrl?: string;
  scriptCode?: string;
  clickUrl?: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvertisementInput {
  zoneId: number;
  type: AdType;
  name: string;
  contentUrl?: string;
  scriptCode?: string;
  clickUrl?: string;
  startDate: Date;
  endDate?: Date;
}

export interface AdvertisementUpdate {
  name?: string;
  contentUrl?: string;
  scriptCode?: string;
  clickUrl?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface AdPerformance {
  zoneId: number;
  zoneName: string;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  averageRevenue?: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
  performanceByDate: Array<{
    date: Date;
    impressions: number;
    clicks: number;
    revenue?: number;
  }>;
}

export interface AdEvent {
  id: number;
  zoneId: number;
  advertisementId?: number;
  eventType: 'impression' | 'click';
  userSession: string;
  userAgent: string;
  ipAddress?: string;
  referrer?: string;
  createdAt: Date;
}

export interface AdEventInput {
  zoneId: number;
  advertisementId?: number;
  eventType: 'impression' | 'click';
  userSession: string;
  userAgent: string;
  ipAddress?: string;
  referrer?: string;
}
