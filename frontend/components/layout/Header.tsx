'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSiteConfig } from '@/context/SiteConfigContext';

/* ── Tab switcher — needs Suspense because of useSearchParams ─────── */
function HomeTabsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const priceActive = pathname === '/' && tab !== 'gadget';
  const gadgetActive = pathname === '/' && tab === 'gadget';

  const baseClass = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
  const activeClass = 'bg-white shadow-sm text-primary-700';
  const inactiveClass = 'text-slate-500 hover:text-slate-800';

  return (
    <div className="hidden items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100/70 p-0.5 sm:flex">
      <Link
        href="/"
        className={`${baseClass} ${priceActive ? activeClass : inactiveClass}`}
      >
        💰 So sánh giá
      </Link>
      <Link
        href="/?tab=gadget"
        className={`${baseClass} ${gadgetActive ? activeClass : inactiveClass}`}
      >
        📱 So sánh Thiết bị
      </Link>
    </div>
  );
}

function HomeMobileTabsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const gadgetActive = pathname === '/' && tab === 'gadget';

  return (
    <>
      <Link
        href="/"
        className={`border-b border-slate-100 py-3 text-sm font-medium ${!gadgetActive && pathname === '/' ? 'text-primary-600' : 'text-slate-700 hover:text-primary-600'}`}
      >
        💰 So sánh giá
      </Link>
      <Link
        href="/?tab=gadget"
        className={`border-b border-slate-100 py-3 text-sm font-medium ${gadgetActive ? 'text-primary-600' : 'text-slate-700 hover:text-primary-600'}`}
      >
        📱 So sánh Thiết bị
      </Link>
    </>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { siteName } = useSiteConfig();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <svg viewBox="0 0 64 64" className="h-7 w-7 shrink-0" aria-hidden="true">
            <g fill="none" stroke="#0284c7" strokeWidth="5" strokeLinecap="round">
              <circle cx="26" cy="26" r="18" fill="white" />
              <line x1="40" y1="40" x2="56" y2="56" />
            </g>
            <text x="26" y="34" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="22" fill="#0369a1" letterSpacing="-0.04em">S</text>
          </svg>
          <span className="text-xl font-bold text-primary-700">{siteName}</span>
        </Link>

        {/* Home tabs — desktop */}
        <Suspense fallback={
          <div className="hidden items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-100/70 p-0.5 sm:flex">
            <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-primary-700 shadow-sm">💰 So sánh giá</span>
            <span className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500">📱 So sánh Thiết bị</span>
          </div>
        }>
          <HomeTabsInner />
        </Suspense>

        {/* Nav links */}
        <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/search" className="transition-colors hover:text-primary-600">Tìm kiếm</Link>
          <Link href="/deals" className="transition-colors hover:text-primary-600">Ưu đãi</Link>
          <Link href="/bai-viet" className="transition-colors hover:text-primary-600">Bài viết</Link>
        </nav>

        {/* Mobile menu button */}
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

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            <Suspense fallback={null}>
              <HomeMobileTabsInner />
            </Suspense>
            <Link href="/search" className="border-b border-slate-100 py-3 text-sm font-medium text-slate-700 hover:text-primary-600" onClick={() => setMobileOpen(false)}>
              Tìm kiếm
            </Link>
            <Link href="/deals" className="border-b border-slate-100 py-3 text-sm font-medium text-slate-700 hover:text-primary-600" onClick={() => setMobileOpen(false)}>
              Ưu đãi
            </Link>
            <Link href="/bai-viet" className="py-3 text-sm font-medium text-slate-700 hover:text-primary-600" onClick={() => setMobileOpen(false)}>
              Bài viết
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
