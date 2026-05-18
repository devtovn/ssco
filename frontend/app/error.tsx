'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-50 to-white px-4">
      <div className="max-w-md text-center" role="alert">
        <p className="text-sm font-medium text-primary-600">Đã xảy ra lỗi</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Không thể tải trang
        </h1>
        <p className="mt-3 text-slate-600">
          Vui lòng thử lại sau. Nếu lỗi tiếp tục, quay về trang chủ để tiếp tục
          so sánh giá.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
