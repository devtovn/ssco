'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSiteConfig } from '@/context/SiteConfigContext';

function HomeTabsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const priceActive = pathname === '/' && tab !== 'gadget';
  const gadgetActive = pathname === '/' && tab === 'gadget';

  const base = 'flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium transition-colors whitespace-nowrap sm:flex-none sm:px-4';
  const active = 'bg-white shadow-sm text-primary-700';
  const inactive = 'text-slate-500 hover:text-slate-800';

  return (
    <div className="flex flex-1 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100/70 p-0.5 sm:flex-none">
      <Link href="/"            className={`${base} ${priceActive  ? active : inactive}`}>
        <span>💰</span>
        <span className="sm:hidden"> Giá</span>
        <span className="hidden sm:inline"> So sánh giá</span>
      </Link>
      <Link href="/?tab=gadget" className={`${base} ${gadgetActive ? active : inactive}`}>
        <span>📱</span>
        <span className="min-[360px]:hidden"> TB</span>
        <span className="hidden min-[360px]:inline sm:hidden"> Thiết bị</span>
        <span className="hidden sm:inline"> So sánh Thiết bị</span>
      </Link>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { siteName } = useSiteConfig();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        {/* Logo — icon only, no text */}
        <Link href="/" className="shrink-0" aria-label={siteName}>
          <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
            <g fill="none" stroke="#0284c7" strokeWidth="5" strokeLinecap="round">
              <circle cx="26" cy="26" r="18" fill="white" />
              <line x1="40" y1="40" x2="56" y2="56" />
            </g>
            <text x="26" y="34" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="22" fill="#0369a1" letterSpacing="-0.04em">S</text>
          </svg>
        </Link>

        {/* Tabs — always visible, fill space on mobile */}
        <Suspense fallback={
          <div className="flex flex-1 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100/70 p-0.5 sm:flex-none">
            <span className="flex-1 rounded-lg bg-white px-3 py-1.5 text-center text-sm font-medium text-primary-700 shadow-sm sm:flex-none sm:px-4">💰 So sánh giá</span>
            <span className="flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium text-slate-500 sm:flex-none sm:px-4">📱 So sánh Thiết bị</span>
          </div>
        }>
          <HomeTabsInner />
        </Suspense>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Nav — desktop only */}
        <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/search"   className="transition-colors hover:text-primary-600">Tìm kiếm</Link>
          <Link href="/deals"    className="transition-colors hover:text-primary-600">Ưu đãi</Link>
          <Link href="/bai-viet" className="transition-colors hover:text-primary-600">Bài viết</Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {mobileOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            <Link href="/search"   className="border-b border-slate-100 py-3 text-sm font-medium text-slate-700 hover:text-primary-600" onClick={() => setMobileOpen(false)}>Tìm kiếm</Link>
            <Link href="/deals"    className="border-b border-slate-100 py-3 text-sm font-medium text-slate-700 hover:text-primary-600" onClick={() => setMobileOpen(false)}>Ưu đãi</Link>
            <Link href="/bai-viet" className="py-3 text-sm font-medium text-slate-700 hover:text-primary-600"                           onClick={() => setMobileOpen(false)}>Bài viết</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
