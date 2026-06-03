import { buildApiUrl } from './client';

export interface SiteConfig {
  siteName: string;
  tagline: string | null;
  logoUrl: string | null;
}

const FALLBACK = 'SSCO';

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(buildApiUrl('/public/config'), {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { siteName: FALLBACK, tagline: null, logoUrl: null };
    const data = await res.json();
    return {
      siteName: data.siteName || FALLBACK,
      tagline: data.tagline ?? null,
      logoUrl: data.logoUrl ?? null,
    };
  } catch (err) {
    console.error('[getSiteConfig]', err);
    return { siteName: FALLBACK, tagline: null, logoUrl: null };
  }
}
