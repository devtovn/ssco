import { getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

export interface SearchResult {
  name: string;
  url: string;
  imageUrl?: string;
}

export interface CrawlResult {
  name: string;
  imageUrl?: string;
  gsmarenaUrl: string;
  announced?: string;
  released?: string;
  status?: string;
  category: 'mobile' | 'tablet' | 'smartwatch';
  specs: Record<string, Record<string, string>>;
}

export interface Device {
  id: string;
  name: string;
  slug: string;
  category: string;
  isPublished: boolean;
  brandName?: string;
  brandSlug?: string;
  announced?: string;
  productId?: string;
  productSlug?: string;
  gsmarenaUrl?: string;
}

export interface ProductResult {
  id: string;
  name: string;
  slug: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  mobile: '📱 Điện thoại',
  tablet: '📲 Máy tính bảng',
  smartwatch: '⌚ Đồng hồ',
};

export type GadgetInputMode = 'keyword' | 'url';

export async function adminPost(path: string, body: unknown) {
  const token = getToken();
  const res = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? json.message ?? 'Lỗi server');
  return json;
}
