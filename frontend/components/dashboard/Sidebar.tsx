'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SidebarItem {
  href: string;
  label: string;
}

export interface SidebarGroup {
  group: string;
  items: SidebarItem[];
}

interface SidebarProps {
  title: string;
  nav: SidebarGroup[];
  onLogout: () => void;
}

function CollapseIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function Sidebar({ title, nav, onLogout }: SidebarProps) {
  const pathname = usePathname();

  // Auto-expand group that contains the active route
  const initialOpen = Object.fromEntries(
    nav.map((section) => [
      section.group,
      section.items.some((item) =>
        pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
      ),
    ])
  );
  // Ensure at least the first group is open by default
  if (nav.length > 0 && !Object.values(initialOpen).some(Boolean)) {
    initialOpen[nav[0].group] = true;
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  function toggle(group: string) {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/admin' && pathname.startsWith(href));
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Bảng điều khiển
        </p>
        <h1 className="mt-1 text-lg font-bold text-primary-700">{title}</h1>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {nav.map((section) => {
          const isOpen = !!openGroups[section.group];
          const hasActive = section.items.some((item) => isActive(item.href));

          return (
            <div key={section.group}>
              {/* Group header — clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => toggle(section.group)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                  hasActive && !isOpen
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {section.group}
                </span>
                <CollapseIcon open={isOpen} />
              </button>

              {/* Group items — indented */}
              {isOpen && (
                <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-slate-200 pl-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-600 hover:bg-white hover:text-primary-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 space-y-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
        >
          <span>Xem website</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
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
