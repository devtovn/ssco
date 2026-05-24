import { Suspense } from 'react';
import { ChuyenHuong } from './ChuyenHuong';

export default function ChuyenHuongPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <ChuyenHuong />
    </Suspense>
  );
}
