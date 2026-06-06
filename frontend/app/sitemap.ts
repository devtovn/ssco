import type { MetadataRoute } from 'next';

const BASE_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const INTERNAL_API =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface SitemapSlugs {
  products: { slug: string; updated_at: string }[];
  categories: { slug: string; updated_at: string }[];
  gadgetBrands: { slug: string; updated_at: string }[];
  gadgetDevices: { brand_slug: string; slug: string; updated_at: string }[];
}

async function fetchSlugs(): Promise<SitemapSlugs> {
  const res = await fetch(`${INTERNAL_API}/api/public/sitemap-slugs`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`sitemap-slugs fetch failed: ${res.status}`);
  return res.json();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,              lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${BASE_URL}/search`,  lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/deals`,   lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE_URL}/gadget`,  lastModified: now, changeFrequency: 'daily',  priority: 0.8 },
    { url: `${BASE_URL}/bai-viet`,lastModified: now, changeFrequency: 'daily',  priority: 0.6 },
  ];

  let slugs: SitemapSlugs;
  try {
    slugs = await fetchSlugs();
  } catch (err) {
    console.error('[sitemap] fetchSlugs failed, returning static only:', err);
    return staticPages;
  }

  const productPages: MetadataRoute.Sitemap = slugs.products.map((p) => ({
    url: `${BASE_URL}/san-pham/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = slugs.categories.map((c) => ({
    url: `${BASE_URL}/danh-muc/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const gadgetBrandPages: MetadataRoute.Sitemap = slugs.gadgetBrands.map((b) => ({
    url: `${BASE_URL}/gadget/${b.slug}`,
    lastModified: new Date(b.updated_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const gadgetDevicePages: MetadataRoute.Sitemap = slugs.gadgetDevices.map((d) => ({
    url: `${BASE_URL}/gadget/${d.brand_slug}/${d.slug}`,
    lastModified: new Date(d.updated_at),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...productPages,
    ...categoryPages,
    ...gadgetBrandPages,
    ...gadgetDevicePages,
  ];
}
