import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { AdZone } from '@/components/ads/AdZone';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <Header />
      <AdZone position="header" className="mx-auto max-w-6xl px-4 py-2" />
      <ErrorBoundary>
        <main className="min-h-screen">{children}</main>
      </ErrorBoundary>
      <footer className="border-t border-slate-200 bg-slate-50">
        <AdZone position="footer" className="mx-auto max-w-6xl px-4 py-4" />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
            <div>
              <p className="font-bold text-primary-700">SSCO</p>
              <p className="mt-1 text-xs text-slate-500">So sánh giá</p>
              <p className="mt-3 text-sm text-slate-600">
                So sánh giá sản phẩm từ Tiki, Lazada, Shopee và nhiều sàn thương mại khác.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Khám phá</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li><Link href="/search" className="transition-colors hover:text-primary-600">Tìm kiếm</Link></li>
                <li><Link href="/deals" className="transition-colors hover:text-primary-600">Ưu đãi tốt nhất</Link></li>
                <li><Link href="/danh-muc/dien-thoai" className="transition-colors hover:text-primary-600">Điện thoại</Link></li>
                <li><Link href="/danh-muc/laptop" className="transition-colors hover:text-primary-600">Laptop</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thông tin</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li><Link href="/bai-viet" className="transition-colors hover:text-primary-600">Bài viết</Link></li>
                <li><Link href="/login" className="transition-colors hover:text-primary-600">Đăng nhập</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} SSCO — So sánh giá Tiki, Lazada, Shopee
          </div>
        </div>
      </footer>
    </>
  );
}
