/**
 * Platform API Service
 * Calls each platform's internal/public API without needing an official API key.
 * Used for development seeding and as a fallback when official API keys are absent.
 *
 * Supported platforms (no-key):  Tiki, Shopee
 * Supported platforms (key needed): Lazada, TikTok Shop → handled by APIIntegratorService
 */

import axios, { AxiosInstance } from 'axios';
import { NormalizedProduct } from './APIIntegratorService';

export interface PlatformSearchResult {
  platform: string;
  products: NormalizedProduct[];
  error?: string;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ─── Vietnamese → ASCII slug helper ──────────────────────────────────────────

const VI_MAP: Record<string, string> = {
  à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a',
  ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
  â: 'a', ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
  è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e',
  ê: 'e', ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e',
  ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
  ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o',
  ô: 'o', ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
  ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
  ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u',
  ư: 'u', ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u',
  ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
  đ: 'd',
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((c) => VI_MAP[c] ?? c)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 280);
}

// ─── URL parsers ──────────────────────────────────────────────────────────────

export function detectPlatform(url: string): string | null {
  if (url.includes('tiki.vn')) return 'tiki';
  if (url.includes('shopee.vn')) return 'shopee';
  if (url.includes('lazada.vn')) return 'lazada';
  if (url.includes('tiktok.com') || url.includes('tiktokshop.com')) return 'tiktok';
  return null;
}

function parseTikiUrl(url: string): { productId: string } | null {
  // /san-pham-slug-p{id}.html  or  /{id}.html  or  /.../{id}
  const m = url.match(/[pP](\d+)\.html/) ?? url.match(/\/(\d{4,})(?:[?#]|$)/);
  return m ? { productId: m[1] } : null;
}

function parseShopeeUrl(url: string): { shopId: string; itemId: string } | null {
  // slug-i.{shopId}.{itemId}  or  /product/{shopId}/{itemId}
  const dot = url.match(/-i\.(\d+)\.(\d+)(?:[?#]|$)/);
  if (dot) return { shopId: dot[1], itemId: dot[2] };
  const slash = url.match(/\/product\/(\d+)\/(\d+)/);
  if (slash) return { shopId: slash[1], itemId: slash[2] };
  return null;
}

// ─── Main service ─────────────────────────────────────────────────────────────

export class PlatformAPIService {
  private tiki: AxiosInstance;
  private shopee: AxiosInstance;

  constructor() {
    this.tiki = axios.create({
      baseURL: 'https://tiki.vn',
      timeout: 15000,
      headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
    });

    this.shopee = axios.create({
      baseURL: 'https://shopee.vn',
      timeout: 15000,
      headers: {
        'User-Agent': BROWSER_UA,
        Referer: 'https://shopee.vn/',
        Accept: 'application/json',
      },
    });
  }

  // ── Tiki ────────────────────────────────────────────────────────────────────

  async getTikiProduct(productId: string): Promise<NormalizedProduct | null> {
    try {
      const { data } = await this.tiki.get(`/api/v2/products/${productId}`, {
        params: { platform: 'web', spid: productId },
      });
      return this.normalizeTiki(data);
    } catch (err) {
      console.error('[getTikiProduct]', err);
      return null;
    }
  }

  async searchTiki(keyword: string, limit = 10): Promise<NormalizedProduct[]> {
    try {
      const { data } = await this.tiki.get('/api/v2/products', {
        params: { q: keyword, limit, include: 'sale_attrs,specifications' },
      });
      const items: any[] = data?.data ?? [];
      return items.flatMap((p) => {
        const n = this.normalizeTiki(p);
        return n ? [n] : [];
      });
    } catch (err) {
      console.error('[searchTiki]', err);
      return [];
    }
  }

  private normalizeTiki(data: any): NormalizedProduct | null {
    const name = data?.name ?? data?.title;
    if (!name) return null;
    const id = data.id?.toString() ?? data.master_id?.toString() ?? '';
    const images: string[] = [];
    if (data.thumbnail_url) images.push(data.thumbnail_url);
    if (Array.isArray(data.images)) {
      images.push(...data.images.map((img: any) => img.base_url ?? img.url ?? img).filter(Boolean));
    }
    return {
      externalId: id,
      name,
      description: data.description ?? data.short_description ?? '',
      brand: data.brand?.name ?? data.brand ?? '',
      model: data.model ?? '',
      price: parseFloat(data.price ?? data.list_price ?? 0),
      currency: 'VND',
      isAvailable: data.inventory_status === 'available' || (data.stock_item?.qty ?? 0) > 0,
      images: [...new Set(images)],
      sourceUrl: data.url_path ? `https://tiki.vn/${data.url_path}` : `https://tiki.vn/p${id}.html`,
      source: 'tiki',
      specifications: data.specifications ?? {},
      metadata: {
        rating: data.rating_average ?? 0,
        reviewCount: data.review_count ?? 0,
        seller: data.current_seller?.name ?? data.seller?.name ?? '',
        originalPrice: parseFloat(data.list_price ?? data.price ?? 0),
      },
    };
  }

  // ── Shopee ──────────────────────────────────────────────────────────────────

  async getShopeeProduct(shopId: string, itemId: string): Promise<NormalizedProduct | null> {
    try {
      const { data } = await this.shopee.get('/api/v4/item/get', {
        params: { itemid: itemId, shopid: shopId },
      });
      return this.normalizeShopee(data?.item, shopId);
    } catch (err) {
      console.error('[getShopeeProduct]', err);
      return null;
    }
  }

  async searchShopee(keyword: string, limit = 10): Promise<NormalizedProduct[]> {
    try {
      const { data } = await this.shopee.get('/api/v4/search/search_items', {
        params: { keyword, limit, newest: 0, by: 'relevancy', version: 2 },
      });
      const items: any[] = data?.items ?? [];
      return items
        .slice(0, limit)
        .flatMap((item) => {
          const n = this.normalizeShopee(item.item_basic, item.item_basic?.shopid?.toString() ?? '');
          return n ? [n] : [];
        });
    } catch (err) {
      console.error('[searchShopee]', err);
      return [];
    }
  }

  private normalizeShopee(data: any, shopId: string): NormalizedProduct | null {
    const name = data?.name ?? data?.item_name;
    if (!name) return null;
    const itemId = data.itemid?.toString() ?? data.item_id?.toString() ?? '';
    const sid = shopId || (data.shopid?.toString() ?? '');
    const rawPrice = data.price ?? data.price_min ?? 0;
    // Shopee stores price as actualVND × 100000
    const price = rawPrice > 100000 ? rawPrice / 100000 : rawPrice;

    const imgHashes: string[] = Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []);
    const images = [...new Set(imgHashes.map((h: string) =>
      h?.startsWith?.('http') ? h : `https://cf.shopee.vn/file/${h}`
    ).filter(Boolean))];

    return {
      externalId: itemId,
      name,
      description: data.description ?? '',
      brand: data.brand ?? '',
      model: '',
      price,
      currency: 'VND',
      isAvailable: data.item_status === 'NORMAL' || (data.stock ?? 0) > 0,
      images,
      sourceUrl: sid && itemId ? `https://shopee.vn/product/${sid}/${itemId}` : '',
      source: 'shopee',
      specifications: {},
      metadata: {
        rating: data.item_rating?.rating_star ?? 0,
        reviewCount: data.item_rating?.rating_count?.[0] ?? 0,
        seller: data.shop_name ?? sid,
        originalPrice: (data.price_max ?? data.price ?? 0) / 100000,
      },
    };
  }

  // ── Dispatcher ──────────────────────────────────────────────────────────────

  /**
   * Fetch a product from any supported platform URL.
   * Returns null for unsupported platforms (Lazada, TikTok) or invalid URLs.
   */
  async getProductFromUrl(url: string): Promise<NormalizedProduct | null> {
    const platform = detectPlatform(url);
    if (platform === 'tiki') {
      const parsed = parseTikiUrl(url);
      return parsed ? this.getTikiProduct(parsed.productId) : null;
    }
    if (platform === 'shopee') {
      const parsed = parseShopeeUrl(url);
      return parsed ? this.getShopeeProduct(parsed.shopId, parsed.itemId) : null;
    }
    return null;
  }

  /**
   * Platforms that work server-side without an API key.
   * Shopee/Lazada/TikTok block all non-browser requests (403 / anti-bot redirect).
   */
  static readonly NO_KEY_PLATFORMS = ['tiki'] as const;

  /**
   * Platforms that require an official API key (blocked server-side without one).
   */
  static readonly KEY_REQUIRED_PLATFORMS = [
    { platform: 'shopee', envVars: 'SHOPEE_PARTNER_ID + SHOPEE_PARTNER_KEY' },
    { platform: 'lazada', envVars: 'LAZADA_API_KEY' },
    { platform: 'tiktok', envVars: 'TIKTOK_SHOP_API_KEY' },
  ] as const;

  /**
   * Search a keyword on platforms accessible without an API key (currently only Tiki).
   * Shopee/Lazada/TikTok block all server-side requests — they require official API keys.
   */
  async searchAllNoKeyPlatforms(keyword: string, limit = 5): Promise<PlatformSearchResult[]> {
    const tikiProducts = await this.searchTiki(keyword, limit).catch((err) => { console.error('[searchAllNoKeyPlatforms]', err); return [] as NormalizedProduct[]; });
    return [{ platform: 'tiki', products: tikiProducts }];
  }
}

export const platformAPIService = new PlatformAPIService();
