'use client';

import { useEffect, useState } from 'react';
import { useSiteConfig } from '@/context/SiteConfigContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const { siteName } = useSiteConfig();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-primary-200 bg-white p-4 shadow-lg md:left-auto">
      <p className="text-sm font-medium text-slate-800">Cài đặt ứng dụng {siteName} trên điện thoại</p>
      <p className="mt-1 text-xs text-slate-500">Truy cập nhanh, trải nghiệm như app native</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white"
          onClick={async () => {
            await deferred.prompt();
            setDismissed(true);
          }}
        >
          Cài đặt
        </button>
        <button
          type="button"
          className="rounded-lg border px-3 py-2 text-sm text-slate-600"
          onClick={() => setDismissed(true)}
        >
          Để sau
        </button>
      </div>
    </div>
  );
}
