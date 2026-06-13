'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ListBulletIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { ProductAddPanel } from './ProductAddPanel';
import { ProductListPanel } from './ProductListPanel';
import { GadgetAddPanel } from './GadgetAddPanel';
import { GadgetListPanel } from './GadgetListPanel';

type ContentTab = 'product' | 'gadget';
type ContentView = 'add' | 'list';

const STORAGE_SUBNAV_COLLAPSED = 'admin-content-subnav-collapsed';
const SUBNAV_EXPANDED_WIDTH = 192;
const SUBNAV_COLLAPSED_WIDTH = 56;

function SubNavCollapseButton({
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
      title={collapsed ? 'Mở menu' : 'Thu gọn menu'}
      aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
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

function ContentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subNavCollapsed, setSubNavCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const tab: ContentTab = searchParams.get('tab') === 'gadget' ? 'gadget' : 'product';
  const view: ContentView = searchParams.get('view') === 'list' ? 'list' : 'add';

  useEffect(() => {
    setSubNavCollapsed(localStorage.getItem(STORAGE_SUBNAV_COLLAPSED) === '1');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_SUBNAV_COLLAPSED, subNavCollapsed ? '1' : '0');
  }, [subNavCollapsed, mounted]);

  function navigate(nextTab: ContentTab, nextView: ContentView) {
    router.push(`/admin/content/add?tab=${nextTab}&view=${nextView}`);
  }

  const addLabel = tab === 'product' ? 'Thêm sản phẩm' : 'Thêm thiết bị';
  const subNavWidth = subNavCollapsed ? SUBNAV_COLLAPSED_WIDTH : SUBNAV_EXPANDED_WIDTH;

  const subItems: { view: ContentView; label: string; Icon: typeof PlusCircleIcon }[] = [
    { view: 'add', label: addLabel, Icon: PlusCircleIcon },
    { view: 'list', label: 'Danh sách', Icon: ListBulletIcon },
  ];

  return (
    <div className="flex h-[calc(100vh)] flex-col overflow-hidden bg-slate-100">
      <div className="shrink-0 space-y-4 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Thêm Nội dung</h1>
          <p className="mt-1 text-sm text-slate-500">
            Crawl và quản lý sản phẩm hoặc thiết bị trong hệ thống
          </p>
        </div>

        <div className="flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(['product', 'gadget'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => navigate(t, 'add')}
              className={`rounded-md px-5 py-2 text-sm font-medium transition ${
                tab === t ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {t === 'product' ? 'Sản phẩm' : 'Thiết bị'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav
          className="flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width] duration-200 ease-out"
          style={{ width: subNavWidth }}
        >
          <div
            className={`flex shrink-0 border-b border-slate-200 p-2 ${
              subNavCollapsed ? 'justify-center' : 'justify-end'
            }`}
          >
            <SubNavCollapseButton
              collapsed={subNavCollapsed}
              onClick={() => setSubNavCollapsed((c) => !c)}
            />
          </div>

          <div className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto p-2">
            {subItems.map(({ view: itemView, label, Icon }) => {
              const active = view === itemView;
              const activeClass =
                tab === 'gadget' && active
                  ? 'border-amber-500 bg-amber-50 text-amber-800'
                  : active
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-primary-700';

              if (subNavCollapsed) {
                return (
                  <button
                    key={itemView}
                    type="button"
                    title={label}
                    onClick={() => navigate(tab, itemView)}
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg border-l-2 ${
                      active
                        ? tab === 'gadget'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-primary-700'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  </button>
                );
              }

              return (
                <button
                  key={itemView}
                  type="button"
                  onClick={() => navigate(tab, itemView)}
                  className={`rounded-lg border-l-2 px-3 py-2.5 text-left text-sm font-medium transition ${activeClass} ${
                    active ? '' : 'border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className={`min-w-0 flex-1 bg-white p-6 ${
            tab === 'product' && view === 'add'
              ? 'flex min-h-0 flex-col overflow-hidden'
              : 'overflow-auto'
          }`}
        >
          {tab === 'product' && view === 'add' && <ProductAddPanel embedded />}
          {tab === 'product' && view === 'list' && <ProductListPanel embedded />}
          {tab === 'gadget' && view === 'add' && <GadgetAddPanel />}
          {tab === 'gadget' && view === 'list' && <GadgetListPanel />}
        </div>
      </div>
    </div>
  );
}

export function ContentAddPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Đang tải…</div>}>
      <ContentPageInner />
    </Suspense>
  );
}
