'use client';

import { FormEvent, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      const from = searchParams.get('from');
      const defaultPath = result.user.role === 'Administrator' ? '/admin' : '/reviewer';
      let target =
        from && from.startsWith('/') ? from : result.redirectUrl || defaultPath;
      // Backend may return legacy paths that do not exist in the App Router
      if (target === '/admin/dashboard') target = '/admin';
      if (target === '/reviewer/dashboard') target = '/reviewer';

      // Full navigation so Next.js middleware receives accessToken / userRole cookies
      window.location.assign(target);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-bold text-primary-700">
          SSCO
        </Link>
        <p className="mt-2 text-sm text-slate-600">Đăng nhập quản trị</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            placeholder="admin@pricecompare.vn"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 px-4">
      <Suspense fallback={<p className="text-sm text-slate-600">Đang tải...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
