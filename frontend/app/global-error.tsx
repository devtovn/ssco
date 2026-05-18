'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-white">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold">Lỗi hệ thống</h1>
            <p className="mt-3 text-slate-300">
              Ứng dụng gặp sự cố không mong muốn. Vui lòng tải lại trang.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-8 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              Tải lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
