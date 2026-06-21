import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { SiteConfigProvider } from '@/context/SiteConfigContext';
import { getSiteConfig } from '@/lib/api/site-config';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const metadata: Metadata = {
  title: {
    default: 'So Sánh Giá — Tìm giá tốt nhất từ Tiki, Lazada, Shopee',
    template: '%s | So Sánh Giá',
  },
  description: 'So sánh giá sản phẩm từ nhiều sàn thương mại điện tử như Tiki, Lazada, TikTok Shop, Shopee. Tìm giá tốt nhất trước khi mua.',
  keywords: [
    'so sánh giá',
    'giá rẻ',
    'mua sắm online',
    'tiki',
    'lazada',
    'shopee',
    'tiktok shop',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0ea5e9',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { siteName, layoutMode, layoutMaxWidth } = await getSiteConfig();

  const layoutCssVar =
    layoutMode === 'full-width'
      ? '1280px'
      : layoutMode === 'custom' && layoutMaxWidth
        ? `${layoutMaxWidth}px`
        : '72rem'; // boxed default = max-w-6xl

  const isFullWidth = layoutMode === 'full-width';

  return (
    <html lang="vi" className={inter.variable} style={{ '--layout-max-width': layoutCssVar } as React.CSSProperties}>
      <head>
        <link rel="preconnect" href={apiUrl} />
        <link rel="dns-prefetch" href={apiUrl} />
      </head>
      <body className={`font-sans antialiased ${isFullWidth ? 'layout-full-width' : ''}`}>
        <SiteConfigProvider siteName={siteName} layoutMode={layoutMode} layoutMaxWidth={layoutMaxWidth}>
          <ErrorBoundary>{children}</ErrorBoundary>
          <PwaInstallPrompt />
        </SiteConfigProvider>
      </body>
    </html>
  );
}
