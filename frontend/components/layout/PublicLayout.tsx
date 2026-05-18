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
        <div className="mx-auto max-w-6xl px-4 pb-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} SSCO — So sánh giá Tiki, Lazada, Shopee
        </div>
      </footer>
    </>
  );
}
