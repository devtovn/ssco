import { apiFetch, buildApiUrl } from './client';

export interface GadgetBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  country?: string;
  deviceCount?: number;
}

export interface GadgetDevice {
  id: string;
  brandId: string;
  brandName?: string;
  brandSlug?: string;
  name: string;
  slug: string;
  category: 'mobile' | 'tablet' | 'smartwatch';
  imageUrl?: string;
  gsmarenaUrl?: string;
  announced?: string;
  released?: string;
  status?: string;
  specs: GadgetSpecs;
  isPublished: boolean;
  productId?: string;
  productSlug?: string;
}

export type GadgetSpecs = Record<string, Record<string, string>>;

export async function getGadgetBrands(): Promise<GadgetBrand[]> {
  return apiFetch<GadgetBrand[]>('/gadget/brands');
}

export async function getBrandDevices(
  brandSlug: string,
  opts?: { category?: string; page?: number }
): Promise<{ brand: GadgetBrand; devices: GadgetDevice[]; pagination: any }> {
  const params: Record<string, string> = {};
  if (opts?.category) params.category = opts.category;
  if (opts?.page) params.page = String(opts.page);
  return apiFetch(`/gadget/brands/${brandSlug}/devices`, { params });
}

export async function getGadgetDevice(slug: string): Promise<GadgetDevice> {
  return apiFetch<GadgetDevice>(`/gadget/devices/${slug}`);
}

export async function compareGadgets(slugs: string[]): Promise<GadgetDevice[]> {
  return apiFetch<GadgetDevice[]>(`/gadget/compare?slugs=${slugs.join(',')}`);
}

export async function searchGadgets(opts: {
  q?: string; category?: string; brand?: string; page?: number;
}): Promise<{ devices: GadgetDevice[]; pagination: any }> {
  const params: Record<string, string> = {};
  if (opts.q) params.q = opts.q;
  if (opts.category) params.category = opts.category;
  if (opts.brand) params.brand = opts.brand;
  if (opts.page) params.page = String(opts.page);
  return apiFetch('/gadget/search', { params });
}
