import { apiPost } from './client';

export type InteractionEventType = 'page_view' | 'click' | 'product_view' | 'search';

export interface TrackInteractionInput {
  eventType: InteractionEventType;
  pagePath?: string;
  productId?: string;
  targetUrl?: string;
  metadata?: Record<string, unknown>;
  userSession?: string;
  userAgent?: string;
  referrer?: string;
}

export async function trackInteraction(input: TrackInteractionInput): Promise<void> {
  await apiPost('/analytics/track', input);
}
