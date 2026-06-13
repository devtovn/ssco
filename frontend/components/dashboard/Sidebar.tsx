'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BanknotesIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FolderIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';

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

const STORAGE_WIDTH = 'admin-sidebar-width';
const STORAGE_COLLAPSED = 'admin-sidebar-collapsed';
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;
const DEFAULT_WIDTH = 224;
const COLLAPSED_WIDTH = 56;

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface GroupTheme {
  icon: HeroIcon;
  idle: string;
  active: string;
  headerActive: string;
  ring: string;
}

const GROUP_THEME: Record<string, GroupTheme> = {
  'Tổng quan': {
    icon: ChartBarSquareIcon,
    idle: 'bg-primary-100 text-primary-600',
    active: 'bg-primary-600 text-white shadow-sm',
    headerActive: 'bg-primary-50 text-primary-800',
    ring: 'ring-primary-400',
  },
  'Bài viết': {
    icon: DocumentTextIcon,
    idle: 'bg-sky-100 text-sky-700',
    active: 'bg-sky-600 text-white shadow-sm',
    headerActive: 'bg-sky-50 text-sky-800',
    ring: 'ring-sky-400',
  },
  'Nội dung': {
    icon: FolderIcon,
    idle: 'bg-amber-100 text-amber-700',
    active: 'bg-amber-500 text-white shadow-sm',
    headerActive: 'bg-amber-50 text-amber-800',
    ring: 'ring-amber-400',
  },
  'Kiếm tiền': {
    icon: BanknotesIcon,
    idle: 'bg-green-100 text-green-700',
    active: 'bg-green-600 text-white shadow-sm',
    headerActive: 'bg-green-50 text-green-800',
    ring: 'ring-green-400',
  },
  'Tiện ích': {
    icon: TicketIcon,
    idle: 'bg-rose-100 text-rose-600',
    active: 'bg-rose-500 text-white shadow-sm',
    headerActive: 'bg-rose-50 text-rose-800',
    ring: 'ring-rose-300',
  },
  'Hệ thống': {
    icon: Cog6ToothIcon,
    idle: 'bg-slate-200 text-slate-600',
    active: 'bg-slate-600 text-white shadow-sm',
    headerActive: 'bg-slate-100 text-slate-800',
    ring: 'ring-slate-400',
  },
};

const DEFAULT_GROUP_THEME = GROUP_THEME['Bài viết'];

function getGroupTheme(group: string): GroupTheme {
  return GROUP_THEME[group] ?? DEFAULT_GROUP_THEME;
}

function GroupIconBadge({
  group,
  active,
  size = 'md',
}: {
  group: string;
  active: boolean;
  size?: 'sm' | 'md';
}) {
  const theme = getGroupTheme(group);
  const Icon = theme.icon;
  const box = size === 'sm' ? 'h-7 w-7 rounded-md' : 'h-10 w-10 rounded-lg';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <span
      className={`flex shrink-0 items-center justify-center ${box} ${
        active ? theme.active : theme.idle
      }`}
    >
      <Icon className={icon} aria-hidden />
    </span>
  );
}

function SidebarCollapseButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
      aria-label={collapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {collapsed ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        )}
      </svg>
    </button>
  );
}

function GroupCollapseIcon({ open }: { open: boolean }) {
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

function readStoredWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  const n = Number(localStorage.getItem(STORAGE_WIDTH));
  return Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH ? n : DEFAULT_WIDTH;
}

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_COLLAPSED) === '1';
}

export function Sidebar({ title, nav, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const resizing = useRef(false);

  const initialOpen = Object.fromEntries(
    nav.map((section) => [
      section.group,
      section.items.some((item) => isPathActive(pathname, item.href)),
    ])
  );
  if (nav.length > 0 && !Object.values(initialOpen).some(Boolean)) {
    initialOpen[nav[0].group] = true;
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  useEffect(() => {
    setSidebarWidth(readStoredWidth());
    setCollapsed(readStoredCollapsed());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_WIDTH, String(sidebarWidth));
  }, [sidebarWidth, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_COLLAPSED, collapsed ? '1' : '0');
  }, [collapsed, mounted]);

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing.current) return;
    setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX)));
  }, []);

  const onResizeEnd = useCallback(() => {
    resizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
    return () => {
      window.removeEventListener('mousemove', onResizeMove);
      window.removeEventListener('mouseup', onResizeEnd);
    };
  }, [onResizeMove, onResizeEnd]);

  function toggle(group: string) {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  function isActive(href: string) {
    return isPathActive(pathname, href);
  }

  const width = collapsed ? COLLAPSED_WIDTH : sidebarWidth;

  return (
    <aside
      className="relative flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50"
      style={{ width }}
    >
      <div className="relative border-b border-slate-200 px-3 py-3">
        {collapsed ? (
          <div className="flex justify-center py-1">
            <SidebarCollapseButton collapsed={collapsed} onClick={() => setCollapsed(false)} />
          </div>
        ) : (
          <>
            <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bảng điều khiển
              </p>
              <SidebarCollapseButton collapsed={collapsed} onClick={() => setCollapsed(true)} />
            </div>
            <h1 className="truncate text-lg font-bold text-primary-700">{title}</h1>
          </>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto p-2">
        {nav.map((section) => {
          const isOpen = collapsed ? false : !!openGroups[section.group];
          const hasActive = section.items.some((item) => isActive(item.href));
          const theme = getGroupTheme(section.group);

          if (collapsed) {
            return (
              <button
                key={section.group}
                type="button"
                title={section.group}
                onClick={() => {
                  setCollapsed(false);
                  setOpenGroups((prev) => ({ ...prev, [section.group]: true }));
                }}
                className={`relative mx-auto rounded-lg ${
                  hasActive
                    ? `ring-2 ring-offset-1 ring-offset-slate-50 ${theme.ring}`
                    : 'hover:brightness-95'
                }`}
              >
                <GroupIconBadge group={section.group} active={hasActive} />
              </button>
            );
          }

          return (
            <div key={section.group}>
              <button
                type="button"
                onClick={() => toggle(section.group)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-2 ${
                  hasActive && !isOpen
                    ? theme.headerActive
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <GroupIconBadge group={section.group} active={hasActive} size="sm" />
                  <span className="truncate text-xs font-semibold uppercase tracking-wider">
                    {section.group}
                  </span>
                </span>
                <GroupCollapseIcon open={isOpen} />
              </button>

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

      <div className="border-t border-slate-200 p-2">
        <button
          type="button"
          onClick={onLogout}
          className={`w-full rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-100 ${
            collapsed ? 'px-2 py-2' : 'px-3 py-2'
          }`}
          title="Đăng xuất"
        >
          {collapsed ? '⎋' : 'Đăng xuất'}
        </button>
      </div>

      {!collapsed && (
        <button
          type="button"
          aria-label="Kéo để đổi độ rộng sidebar"
          className="group absolute right-0 top-0 z-10 flex h-full w-1.5 cursor-col-resize items-center justify-center hover:bg-primary-200/30"
          onMouseDown={() => {
            resizing.current = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          <span className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
            <span className="h-1 w-0.5 rounded-full bg-slate-300" />
            <span className="h-1 w-0.5 rounded-full bg-slate-300" />
            <span className="h-1 w-0.5 rounded-full bg-slate-300" />
          </span>
        </button>
      )}
    </aside>
  );
}

function isPathActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/admin') return false;

  if (href === '/admin/content/add') {
    return (
      pathname.startsWith('/admin/content') ||
      pathname.startsWith('/admin/seed') ||
      pathname.startsWith('/admin/products') ||
      pathname.startsWith('/admin/gadget')
    );
  }

  return pathname.startsWith(href);
}
