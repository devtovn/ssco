'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export function GadgetSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) router.push(`/gadget/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto w-full max-w-2xl">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 sm:left-4" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm iPhone 17, Galaxy S25 Ultra..."
        className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-10 pr-14 text-base shadow-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500 sm:py-4 sm:pl-12 sm:pr-32"
        aria-label="Tìm kiếm thiết bị"
        autoComplete="off"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 sm:px-5"
      >
        <MagnifyingGlassIcon className="h-4 w-4 sm:hidden" aria-hidden />
        <span className="hidden sm:inline">Tìm kiếm</span>
      </button>
    </form>
  );
}
