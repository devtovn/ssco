'use client';

import { createContext, useContext } from 'react';
import type { LayoutMode } from '@/lib/api/site-config';

interface SiteConfigContextValue {
  siteName: string;
  layoutMode: LayoutMode;
  layoutMaxWidth: number | null;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  siteName: 'SSCO',
  layoutMode: 'boxed',
  layoutMaxWidth: null,
});

export function SiteConfigProvider({
  siteName,
  layoutMode = 'boxed',
  layoutMaxWidth = null,
  children,
}: {
  siteName: string;
  layoutMode?: LayoutMode;
  layoutMaxWidth?: number | null;
  children: React.ReactNode;
}) {
  return (
    <SiteConfigContext.Provider value={{ siteName, layoutMode, layoutMaxWidth }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
