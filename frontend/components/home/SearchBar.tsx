'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getSearchSuggestions } from '@/lib/api/search';
import type { SearchSuggestion } from '@price-comparison/types';

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getSearchSuggestions(query.trim());
        setSuggestions(data);
        setIsOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const submitSearch = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router]
  );

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch(query);
        }}
        className="relative"
      >
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 sm:left-4" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Tìm iPhone, laptop, tủ lạnh..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-10 pr-14 text-base shadow-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500 sm:py-4 sm:pl-12 sm:pr-32"
          aria-label="Tìm kiếm sản phẩm"
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

      {isOpen && (suggestions.length > 0 || loading) && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {loading && <li className="px-4 py-3 text-sm text-slate-500">Đang gợi ý...</li>}
          {suggestions.map((item) => (
            <li key={`${item.type}-${item.text}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
                onMouseDown={() => submitSearch(item.text)}
              >
                <span>{item.text}</span>
                <span className="text-xs uppercase text-slate-400">{item.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
