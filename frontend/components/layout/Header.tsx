'use client';

import { useState } from 'react';
import Link from 'next/link';

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 64 64" className="h-7 w-7 shrink-0" aria-hidden="true">
            <g fill="none" stroke="#0284c7" strokeWidth="5" strokeLinecap="round">
              <circle cx="26" cy="26" r="18" fill="white" />
              <line x1="40" y1="40" x2="56" y2="56" />
            </g>
            <text x="26" y="34" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="22" fill="#0369a1" letterSpacing="-0.04em">S</text>
          </svg>
          <span className="text-xl font-bold text-primary-700">SSCO</span>
          <span className="hidden text-sm font-normal text-slate-500 sm:inline">So sánh giá</span>
        </Link>

        <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/search" className="transition-colors hover:text-primary-600">
            Tìm kiếm
          </Link>
          <Link href="/deals" className="transition-colors hover:text-primary-600">
            Ưu đãi
          </Link>
          <Link href="/bai-viet" className="transition-colors hover:text-primary-600">
            Bài viết
          </Link>
        </nav>

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

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            <Link
              href="/search"
              className="border-b border-slate-100 py-3 text-sm font-medium text-slate-700 hover:text-primary-600"
              onClick={() => setMobileOpen(false)}
            >
              Tìm kiếm
            </Link>
            <Link
              href="/deals"
              className="border-b border-slate-100 py-3 text-sm font-medium text-slate-700 hover:text-primary-600"
              onClick={() => setMobileOpen(false)}
            >
              Ưu đãi
            </Link>
            <Link
              href="/bai-viet"
              className="py-3 text-sm font-medium text-slate-700 hover:text-primary-600"
              onClick={() => setMobileOpen(false)}
            >
              Bài viết
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
