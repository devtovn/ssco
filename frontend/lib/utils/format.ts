export function formatPrice(value?: number | null): string {
  if (value == null || Number.isNaN(value) || value <= 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

const VN_TZ = 'Asia/Ho_Chi_Minh';

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: VN_TZ,
  }).format(d);
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: VN_TZ,
  }).format(d);
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
