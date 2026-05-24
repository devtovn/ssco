'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SidebarItem {
  href: string;
  label: string;
}

interface SidebarProps {
  title: string;
  items: SidebarItem[];
  onLogout: () => void;
}

export function Sidebar({ title, items, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Bảng điều khiển
        </p>
        <h1 className="mt-1 text-lg font-bold text-primary-700">{title}</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin' &&
              item.href !== '/reviewer' &&
              pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-white hover:text-primary-700'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
