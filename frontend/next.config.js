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
    domains: ['salt.tikicdn.com', 'laz-img-cdn.alicdn.com', 'down-vn.img.susercontent.com'],
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
