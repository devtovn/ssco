'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// All reviewer routes have been consolidated under /admin/
export default function ReviewerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const adminPath = pathname.replace(/^\/reviewer/, '/admin');
    router.replace(adminPath);
  }, [pathname, router]);

  return null;
}
