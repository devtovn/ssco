'use client';

import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/dashboard/AuthGuard';
import { Sidebar, type SidebarItem } from '@/components/dashboard/Sidebar';
import { logout } from '@/lib/auth';

const adminNav: SidebarItem[] = [
  { href: '/admin', label: 'Tổng quan' },
  { href: '/admin/analytics', label: 'Phân tích' },
  { href: '/admin/reviewers', label: 'Biên tập viên' },
  { href: '/admin/config', label: 'Cấu hình' },
  { href: '/admin/ads', label: 'Quảng cáo' },
  { href: '/admin/affiliate', label: 'Affiliate' },
  { href: '/admin/categories', label: 'Danh mục' },
  { href: '/admin/products', label: 'Sản phẩm' },
  { href: '/admin/seed', label: 'Thêm sản phẩm' },
  { href: '/reviewer/generate', label: 'Tạo bài viết' },
  { href: '/reviewer/articles', label: 'Bài viết' },
  { href: '/admin/pending', label: 'Chờ duyệt' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <AuthGuard requiredRole="Administrator">
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar title="Quản trị" items={adminNav} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
