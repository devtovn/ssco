const API_BASE =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_PREFIX = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function buildApiUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const url = new URL(`${API_BASE}${API_PREFIX}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | number | undefined> }
): Promise<T> {
  const { params, ...init } = options || {};
  const response = await fetch(buildApiUrl(path, params), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    next: !init?.method || init.method === 'GET' ? { revalidate: 60 } : undefined,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      json?.error?.message || json?.error || 'Request failed',
      response.status,
      json?.error?.code
    );
  }

  return (json.data ?? json) as T;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  options?: RequestInit
): Promise<T | void> {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 204) return;

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      json?.error?.message || json?.error || 'Request failed',
      response.status,
      json?.error?.code
    );
  }

  return (json.data ?? json) as T;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T;
}
