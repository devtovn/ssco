'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, getToken, type AuthUser, type UserRole } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole | UserRole[];
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    getMe()
      .then((me) => {
        const allowed = Array.isArray(requiredRole)
          ? requiredRole.includes(me.role)
          : me.role === requiredRole;
        if (!allowed) {
          window.location.assign(me.role === 'Administrator' ? '/admin' : '/reviewer');
          return;
        }
        setUser(me);
      })
      .catch(() => {
        window.location.assign('/login');
      })
      .finally(() => setLoading(false));
  }, [requiredRole, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Đang xác thực...</p>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
