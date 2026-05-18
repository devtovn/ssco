import { apiFetch, apiPost } from './client';
import type { PriceComparison, PriceHistory } from '@price-comparison/types';

export async function getProductPrices(productId: string): Promise<PriceComparison> {
  return apiFetch<PriceComparison>(`/products/${productId}/prices`);
}

export async function getPriceHistory(
  productId: string,
  options?: { source?: string; days?: number }
): Promise<PriceHistory> {
  return apiFetch<PriceHistory>(`/products/${productId}/price-history`, {
    params: {
      source: options?.source,
      days: options?.days ?? 30,
    },
  });
}

export interface AffiliateLinkResponse {
  originalUrl: string;
  affiliateLink: string;
  platformId: string;
  campaignId?: string;
}

export async function generateAffiliateLink(input: {
  productUrl: string;
  platformId: string;
  campaignId?: string;
}): Promise<AffiliateLinkResponse> {
  return (await apiPost<AffiliateLinkResponse>('/affiliate/generate-link', input)) as AffiliateLinkResponse;
}

export async function trackClick(input: {
  platformId: string;
  generatedLink: string;
  productId: string;
  userSession: string;
  userAgent: string;
  referrer?: string;
  campaignId?: string;
}): Promise<{ clickId: string; message: string }> {
  return (await apiPost<{ clickId: string; message: string }>(
    '/affiliate/track-click',
    input
  )) as { clickId: string; message: string };
}
