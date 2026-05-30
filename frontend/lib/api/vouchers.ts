import { buildApiUrl } from './client';
import { apiFetchWithAuth } from '@/lib/auth';

export type VoucherType = 'cashback' | 'shipping' | 'discount';
export type VoucherSource = 'tiki' | 'shopee' | 'lazada' | 'tiktok';

export interface Voucher {
  id: string;
  code: string;
  description: string;
  source: VoucherSource;
  type: VoucherType;
  expires: string;      // DD/MM/YYYY — for display
  expires_iso?: string; // YYYY-MM-DD — for form input
  is_active?: boolean;
}

export interface VoucherInput {
  code: string;
  description: string;
  source: VoucherSource;
  type: VoucherType;
  expires_at: string;   // YYYY-MM-DD
  is_active?: boolean;
}

// Public: fetch active non-expired vouchers (optionally by source)
export async function fetchVouchers(source?: string): Promise<Voucher[]> {
  const url = buildApiUrl('/vouchers', source ? { source } : undefined);
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.vouchers ?? [];
}

// Admin: fetch all vouchers including expired
export async function fetchAllVouchers(): Promise<Voucher[]> {
  const json = await apiFetchWithAuth<{ vouchers: Voucher[] }>('/vouchers/all');
  return json.vouchers ?? [];
}

export async function createVoucher(data: VoucherInput): Promise<Voucher> {
  const json = await apiFetchWithAuth<{ voucher: Voucher }>('/vouchers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return json.voucher;
}

export async function updateVoucher(id: string, data: Partial<VoucherInput>): Promise<Voucher> {
  const json = await apiFetchWithAuth<{ voucher: Voucher }>(`/vouchers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return json.voucher;
}

export async function deleteVoucher(id: string): Promise<void> {
  await apiFetchWithAuth(`/vouchers/${id}`, { method: 'DELETE' });
}
