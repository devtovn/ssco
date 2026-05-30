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
      </div>
    </AuthGuard>
  );
}
