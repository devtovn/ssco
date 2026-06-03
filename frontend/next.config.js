/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable standalone output for Docker production builds
  output: 'standalone',
  images: {
    remotePatterns: [
      // Tiki
      { protocol: 'https', hostname: '**.tikicdn.com' },
      { protocol: 'https', hostname: '**.tiki.vn' },
      // Shopee
      { protocol: 'https', hostname: '**.shopee.vn' },
      { protocol: 'https', hostname: '**.susercontent.com' },
      { protocol: 'https', hostname: 'cf.shopee.vn' },
      // Lazada
      { protocol: 'https', hostname: '**.alicdn.com' },
      { protocol: 'https', hostname: '**.lazada.vn' },
      { protocol: 'https', hostname: '**.lazcdn.com' },
      // TikTok Shop
      { protocol: 'https', hostname: '**.tiktok.com' },
      { protocol: 'https', hostname: '**.tiktokcdn.com' },
      { protocol: 'https', hostname: '**.tiktokcdn-us.com' },
      // GSMArena
      { protocol: 'https', hostname: '**.gsmarena.com' },
      { protocol: 'https', hostname: 'fdn2.gsmarena.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Configure headers for better caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
