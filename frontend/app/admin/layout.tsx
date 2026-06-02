'use client';

import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/dashboard/AuthGuard';
import { Sidebar, type SidebarGroup } from '@/components/dashboard/Sidebar';
import { logout, getStoredRole } from '@/lib/auth';

const reviewerNav: SidebarGroup[] = [
  {
    group: 'Nội dung',
    items: [
      { href: '/admin', label: 'Tổng quan' },
      { href: '/admin/generate', label: 'Tạo bài viết' },
      { href: '/admin/articles', label: 'Bài viết' },
      { href: '/admin/pending', label: 'Chờ duyệt' },
    ],
  },
];

const adminNav: SidebarGroup[] = [
  {
    group: 'Tổng quan',
    items: [
      { href: '/admin', label: 'Tổng quan' },
      { href: '/admin/analytics', label: 'Phân tích' },
    ],
  },
  {
    group: 'Nội dung',
    items: [
      { href: '/admin/generate', label: 'Tạo bài viết' },
      { href: '/admin/articles', label: 'Bài viết' },
      { href: '/admin/pending', label: 'Chờ duyệt' },
      { href: '/admin/reviewers', label: 'Biên tập viên' },
    ],
  },
  {
    group: 'Sản phẩm',
    items: [
      { href: '/admin/categories', label: 'Danh mục' },
      { href: '/admin/products', label: 'Sản phẩm' },
      { href: '/admin/seed', label: 'Thêm sản phẩm' },
    ],
  },
  {
    group: 'Kiếm tiền',
    items: [
      { href: '/admin/ads', label: 'Quảng cáo' },
      { href: '/admin/affiliate', label: 'Affiliate' },
    ],
  },
  {
    group: 'Thiết bị',
    items: [
      { href: '/admin/gadget', label: '📱 So sánh Thiết bị' },
    ],
  },
  {
    group: 'Tiện ích',
    items: [
      { href: '/admin/vouchers', label: 'Voucher' },
    ],
  },
  {
    group: 'Hệ thống',
    items: [
      { href: '/admin/config', label: 'Cấu hình' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const role = getStoredRole();
  const nav = role === 'Administrator' ? adminNav : reviewerNav;
  const title = role === 'Administrator' ? 'Quản trị' : 'Biên tập';

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <AuthGuard requiredRole={['Administrator', 'Reviewer']}>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar title={title} nav={nav} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 rounded-l-lg border border-r-0 border-primary-200 bg-primary-50 px-2 py-3 text-xs font-medium text-primary-700 shadow transition hover:bg-primary-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="[writing-mode:vertical-rl] rotate-180">Xem website</span>
        </a>
      </div>
    </AuthGuard>
  );
}
