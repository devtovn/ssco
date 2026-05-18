'use client';

import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/dashboard/AuthGuard';
import { Sidebar, type SidebarItem } from '@/components/dashboard/Sidebar';
import { logout } from '@/lib/auth';

const reviewerNav: SidebarItem[] = [
  { href: '/reviewer', label: 'Tổng quan' },
  { href: '/reviewer/generate', label: 'Tạo bài viết' },
  { href: '/reviewer/articles', label: 'Bài viết' },
  { href: '/reviewer/pending', label: 'Chờ duyệt' },
];

export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <AuthGuard requiredRole="Reviewer">
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar title="Biên tập" items={reviewerNav} onLogout={handleLogout} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
