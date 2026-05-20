import { buildApiUrl } from './api/client';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const ROLE_KEY = 'userRole';

export type UserRole = 'Administrator' | 'Reviewer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  permissions?: Record<string, boolean>;
  isActive?: boolean;
  lastLogin?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  user: AuthUser;
  tokens: AuthTokens;
  redirectUrl?: string;
}

function setAuthCookies(accessToken: string, role: UserRole, expiresIn: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = expiresIn > 0 ? expiresIn : 3600;
  // JWT is base64url — do not encodeURIComponent (middleware must read the same value)
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_KEY}=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  document.cookie = `${ROLE_KEY}=${role}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${ROLE_KEY}=; path=/; max-age=0`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY) as UserRole | null;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await fetch(buildApiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json.error === 'string'
        ? json.error
        : json.error?.message || json.message || 'Đăng nhập thất bại';
    throw new Error(message);
  }

  const result = json as LoginResult;

  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, result.tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, result.tokens.refreshToken);
    localStorage.setItem(ROLE_KEY, result.user.role);
    setAuthCookies(result.tokens.accessToken, result.user.role, result.tokens.expiresIn);
  }

  return result;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(buildApiUrl('/auth/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Clear local session even if server logout fails
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
    clearAuthCookies();
  }
}

export async function getMe(): Promise<AuthUser> {
  const data = await apiFetchWithAuth<{ user: AuthUser }>('/auth/me');
  return data.user;
}

export async function apiFetchWithAuth<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined> }
): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new Error('Chưa đăng nhập');
  }

  const response = await fetch(buildApiUrl(path, options?.params), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json.error === 'string'
        ? json.error
        : json.error?.message || json.message || 'Yêu cầu thất bại';
    throw new Error(message);
  }

  return (json.data ?? json) as T;
}
