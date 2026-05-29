import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function readCookie(request: NextRequest, name: string): string | undefined {
  const raw = request.cookies.get(name)?.value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function middleware(request: NextRequest) {
  const token = readCookie(request, 'accessToken');
  const role = readCookie(request, 'userRole');
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (!token || (role !== 'Administrator' && role !== 'Reviewer')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
