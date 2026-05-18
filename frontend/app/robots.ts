import type { MetadataRoute } from 'next';

const baseUrl =
  process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
