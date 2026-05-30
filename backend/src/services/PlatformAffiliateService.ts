/**
 * PlatformAffiliateService
 *
 * Generates pre-built affiliate tracking URLs for each supported platform.
 * Called ONCE at seed time — the result is stored in price_entries.affiliate_url.
 * No runtime API calls at redirect time.
 *
 * Priority order: TikTok Shop → Tiki → Lazada → Shopee
 */

import axios from 'axios';

// ── Credential shapes ─────────────────────────────────────────────────────────

export interface TikiCredentials {
  refCode: string;
}

export interface ShopeeCredentials {
  pubId: string;
  accessToken: string;
}

export interface TikTokCredentials {
  appKey: string;
  accessToken: string;
}

export interface LazadaCredentials {
  /** AccessTrade app token */
  appToken: string;
  /** AccessTrade campaign ID for Lazada */
  campaignId: string;
}

export type PlatformCredentials =
  | ({ platform: 'tiki' } & TikiCredentials)
  | ({ platform: 'shopee' } & ShopeeCredentials)
  | ({ platform: 'tiktok' } & TikTokCredentials)
  | ({ platform: 'lazada' } & LazadaCredentials);

export interface GenerateResult {
  affiliateUrl: string;
  method: 'auto' | 'api';
}

// ── Tiki ──────────────────────────────────────────────────────────────────────

/**
 * Tiki affiliate: append ?ref=CODE to the product URL.
 * No API call needed — officially documented by Tiki Affiliate.
 */
export function generateTikiAffiliateUrl(
  sourceUrl: string,
  creds: TikiCredentials
): GenerateResult {
  const url = new URL(sourceUrl);
  url.searchParams.set('ref', creds.refCode);
  return { affiliateUrl: url.toString(), method: 'auto' };
}

// ── TikTok Shop ───────────────────────────────────────────────────────────────

/**
 * TikTok Shop Affiliate: call TikTok Open Platform to generate a tracking link.
 *
 * Docs: https://partner.tiktokshop.com/doc/page/5308
 * Auth: Bearer access_token obtained via TikTok Open Platform OAuth
 */
export async function generateTikTokAffiliateUrl(
  sourceUrl: string,
  creds: TikTokCredentials
): Promise<GenerateResult> {
  const res = await axios.post(
    'https://open-api.tiktokglobalshop.com/api/affiliate/202309/links/generate',
    { product_url: sourceUrl },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-tts-access-token': creds.accessToken,
        'x-tts-app-key': creds.appKey,
      },
      timeout: 10_000,
    }
  );

  const data = res.data;
  // Response shape: { code: 0, data: { affiliate_link: "https://vt.tiktok.com/..." } }
  if (data?.code !== 0) {
    throw new Error(`TikTok API error ${data?.code}: ${data?.message ?? 'Unknown'}`);
  }
  const affiliateUrl: string = data?.data?.affiliate_link;
  if (!affiliateUrl) throw new Error('TikTok API returned no affiliate_link');

  return { affiliateUrl, method: 'api' };
}

// ── Shopee ────────────────────────────────────────────────────────────────────

/**
 * Shopee Affiliate: call Shopee Open Affiliate GraphQL API.
 *
 * Docs: https://open.shopee.com/documents?module=126&type=1&id=8
 * Requires: Publisher ID + Access Token from Shopee Open Platform
 */
export async function generateShopeeAffiliateUrl(
  sourceUrl: string,
  creds: ShopeeCredentials
): Promise<GenerateResult> {
  const query = `
    mutation {
      generateShortLink(input: {
        originUrl: "${sourceUrl.replace(/"/g, '\\"')}",
        subIds: ["ssco", "${creds.pubId}"]
      }) {
        shortLink
      }
    }
  `;

  const res = await axios.post(
    'https://open-api.affiliate.shopee.vn/graphql',
    { query },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.accessToken}`,
      },
      timeout: 10_000,
    }
  );

  const shortLink: string | undefined =
    res.data?.data?.generateShortLink?.shortLink;
  if (!shortLink) {
    const errors = res.data?.errors;
    throw new Error(
      `Shopee API error: ${errors?.[0]?.message ?? JSON.stringify(res.data)}`
    );
  }

  return { affiliateUrl: shortLink, method: 'api' };
}

// ── Lazada (AccessTrade VN) ───────────────────────────────────────────────────

/**
 * Lazada affiliate via AccessTrade Vietnam.
 *
 * Docs: https://api.accesstrade.vn
 * Requires: App Token + Campaign ID from accesstrade.vn dashboard
 */
export async function generateLazadaAffiliateUrl(
  sourceUrl: string,
  creds: LazadaCredentials
): Promise<GenerateResult> {
  const res = await axios.post(
    'https://api.accesstrade.vn/v1/link_generate',
    {
      url: sourceUrl,
      campaign_id: creds.campaignId,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.appToken}`,
      },
      timeout: 10_000,
    }
  );

  // Response: { status: "success", data: { tracking_url: "https://..." } }
  if (res.data?.status !== 'success') {
    throw new Error(
      `AccessTrade API error: ${res.data?.message ?? JSON.stringify(res.data)}`
    );
  }

  const affiliateUrl: string = res.data?.data?.tracking_url;
  if (!affiliateUrl) throw new Error('AccessTrade returned no tracking_url');

  return { affiliateUrl, method: 'api' };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function generateAffiliateLinkForPlatform(
  sourceUrl: string,
  creds: PlatformCredentials
): Promise<GenerateResult> {
  switch (creds.platform) {
    case 'tiki':
      return generateTikiAffiliateUrl(sourceUrl, creds);
    case 'tiktok':
      return generateTikTokAffiliateUrl(sourceUrl, creds);
    case 'shopee':
      return generateShopeeAffiliateUrl(sourceUrl, creds);
    case 'lazada':
      return generateLazadaAffiliateUrl(sourceUrl, creds);
    default:
      throw new Error(`Platform not supported: ${(creds as any).platform}`);
  }
}
