'use client';

import { createContext, useContext } from 'react';

interface SiteConfigContextValue {
  siteName: string;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({ siteName: 'SSCO' });

export function SiteConfigProvider({
  siteName,
  children,
}: {
  siteName: string;
  children: React.ReactNode;
}) {
  return (
    <SiteConfigContext.Provider value={{ siteName }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}
