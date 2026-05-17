import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'So Sánh Giá - Website So Sánh Giá Sản Phẩm',
  description:
    'So sánh giá sản phẩm từ nhiều sàn thương mại điện tử như Tiki, Lazada, TikTok Shop, Shopee',
  keywords: [
    'so sánh giá',
    'giá rẻ',
    'mua sắm online',
    'tiki',
    'lazada',
    'shopee',
    'tiktok shop',
  ],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
  themeColor: '#0ea5e9',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
