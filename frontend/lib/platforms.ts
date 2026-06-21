export const PLATFORM_LABELS: Record<string, string> = {
  tiki: 'Tiki',
  shopee: 'Shopee',
  lazada: 'Lazada',
  tiktok: 'TikTok Shop',
  tiktok_shop: 'TikTok Shop',
};

export const PLATFORM_LOGOS: Record<string, string> = {
  tiki: '/platforms/tiki.png',
  shopee: '/platforms/shopee.svg',
  lazada: '/platforms/lazada.png',
  tiktok: '/platforms/tiktok-shop.svg',
  tiktok_shop: '/platforms/tiktok-shop.svg',
};

const PLATFORM_ORDER = ['tiki', 'shopee', 'lazada', 'tiktok', 'tiktok_shop'];

export function getPlatformLabel(source?: string | null): string {
  if (!source) return '';
  return PLATFORM_LABELS[source] ?? source;
}

export function getPlatformLogo(source: string): string | undefined {
  return PLATFORM_LOGOS[source];
}

export function sortPlatformSources(sources: string[]): string[] {
  const order = new Map(PLATFORM_ORDER.map((id, index) => [id, index]));
  return [...sources].sort(
    (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || a.localeCompare(b)
  );
}
