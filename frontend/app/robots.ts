import type { MetadataRoute } from 'next';

const baseUrl =
  process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/reviewer/',
          '/login',
          '/chuyen-huong/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
