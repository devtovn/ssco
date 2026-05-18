import type { MetadataRoute } from 'next';

const baseUrl =
  process.env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/deals`,
      lastModified,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
  ];
}
