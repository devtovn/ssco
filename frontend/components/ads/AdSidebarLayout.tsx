'use client';

import { useEffect, useState } from 'react';
import { getAdZones } from '@/lib/api/ads';
import { AdZone } from './AdZone';

interface AdSidebarLayoutProps {
  children: React.ReactNode;
}

export function AdSidebarLayout({ children }: AdSidebarLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    getAdZones({ isActive: true, position: 'sidebar' })
      .then((zones) => setShowSidebar(zones.length > 0))
      .catch((err) => { console.error('[AdSidebarLayout]', err); });
  }, []);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
      <div>{children}</div>
      <aside className="hidden lg:block">
        <div className="sticky top-4">
          <AdZone position="sidebar" />
        </div>
      </aside>
    </div>
  );
}
