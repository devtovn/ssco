'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NormalizedProduct {
  externalId: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  price: number;
  currency: string;
  isAvailable: boolean;
  images: string[];
  sourceUrl: string;
  source: string;
  specifications?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface PlatformResult {
  platform: string;
  products: NormalizedProduct[];
  error?: string;
}

interface PreviewResponse {
  primary: NormalizedProduct | null;
  platformResults: PlatformResult[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  tiki: 'Tiki',
  shopee: 'Shopee',
  lazada: 'Lazada',
  tiktok: 'TikTok Shop',
  tiktok_shop: 'TikTok Shop',
};

function formatVND(price: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

async function adminFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error('Chưa đăng nhập');
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? json.message ?? 'Lỗi máy chủ');
  return json;
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  selected,
  onToggle,
  isPrimary,
}: {
  product: NormalizedProduct;
  selected: boolean;
  onToggle: () => void;
  isPrimary?: boolean;
}) {
  const img = product.images[0];
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
        selected
          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-400'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 shrink-0 accent-primary-600" />
      {img && (
        <img src={img} alt={product.name} className="h-16 w-16 shrink-0 rounded-lg object-contain" />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-slate-900">{product.name}</p>
        {product.brand && <p className="mt-0.5 text-xs text-slate-500">{product.brand}</p>}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-primary-700">{formatVND(product.price)}</span>
          {isPrimary && (
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
              Chính
            </span>
          )}
          {!product.isAvailable && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Hết hàng</span>
          )}
        </div>
        <a
          href={product.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 inline-block max-w-full truncate text-xs text-slate-400 underline hover:text-primary-600"
        >
          {product.sourceUrl}
        </a>
      </div>
    </label>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SeedPage() {
  // Form
  const [mode, setMode] = useState<'url' | 'keyword'>('url');
  const [input, setInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Preview state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  // Selection state: key = `${platform}::${externalId}`
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // In keyword mode, also track which product is "primary" (used for product name)
  const [primaryKey, setPrimaryKey] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    productId: string;
    productName: string;
    productSlug: string;
    priceEntriesCount: number;
  } | null>(null);

  // ── Load categories ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(buildApiUrl('/categories/tree'))
      .then((r) => r.json())
      .then((data) => {
        const flat: Category[] = [];
        // Tree nodes: { category: { id, name, slug, parentId }, children: [] }
        function flatten(nodes: any[], prefix = '') {
          for (const node of nodes) {
            const c = node.category ?? node;
            flat.push({ id: c.id, name: prefix + c.name, slug: c.slug, parentId: c.parentId ?? null });
            if (node.children?.length) flatten(node.children, prefix + c.name + ' › ');
          }
        }
        flatten(Array.isArray(data) ? data : data.data ?? []);
        setCategories(flat);
      })
      .catch(() => {});
  }, []);

  // ── Preview ──────────────────────────────────────────────────────────────────

  async function handlePreview() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setSelected(new Set());
    setPrimaryKey(null);
    setSaveResult(null);

    try {
      const body =
        mode === 'url'
          ? { type: 'url', url: input.trim() }
          : { type: 'keyword', keyword: input.trim() };

      const result: PreviewResponse = await adminFetch(
        buildApiUrl('/admin/seed/preview'),
        { method: 'POST', body: JSON.stringify(body) }
      );

      setPreview(result);

      // Auto-select all returned products
      const initSelected = new Set<string>();
      if (result.primary) {
        const key = `${result.primary.source}::${result.primary.externalId}`;
        initSelected.add(key);
        setPrimaryKey(key);
      }
      for (const r of result.platformResults) {
        if (r.products.length > 0) {
          const best = r.products[0];
          initSelected.add(`${best.source}::${best.externalId}`);
          if (!primaryKey && !result.primary) setPrimaryKey(`${best.source}::${best.externalId}`);
        }
      }
      setSelected(initSelected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!preview || selected.size === 0 || !categoryId) return;
    setSaving(true);
    setError(null);

    try {
      // Collect all products from preview
      const allProducts: NormalizedProduct[] = [];
      if (preview.primary) allProducts.push(preview.primary);
      for (const r of preview.platformResults) allProducts.push(...r.products);

      // Filter selected
      const entries = allProducts.filter((p) =>
        selected.has(`${p.source}::${p.externalId}`)
      );

      // Determine primary product
      let primary = entries.find((p) => `${p.source}::${p.externalId}` === primaryKey);
      if (!primary) primary = entries[0];

      const result = await adminFetch(buildApiUrl('/admin/seed/save'), {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          categorySlug,
          primary,
          entries,
        }),
      });

      setSaveResult(result);
      setPreview(null);
      setSelected(new Set());
      setInput('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────────

  function toggleProduct(product: NormalizedProduct) {
    const key = `${product.source}::${product.externalId}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (primaryKey === key) {
          // promote next selected to primary
          const remaining = [...next][0] ?? null;
          setPrimaryKey(remaining);
        }
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function isSelected(product: NormalizedProduct) {
    return selected.has(`${product.source}::${product.externalId}`);
  }

  function isPrimary(product: NormalizedProduct) {
    return `${product.source}::${product.externalId}` === primaryKey;
  }

  function makePrimary(product: NormalizedProduct) {
    const key = `${product.source}::${product.externalId}`;
    setSelected((prev) => new Set([...prev, key]));
    setPrimaryKey(key);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Thêm sản phẩm</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nhập link sản phẩm hoặc từ khóa để tìm và thêm vào database
        </p>
      </div>

      {/* ── Form ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Category */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700">
            Danh mục <span className="text-red-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => {
              const cat = categories.find((c) => c.id === e.target.value);
              setCategoryId(e.target.value);
              setCategorySlug(cat?.slug ?? '');
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">— Chọn danh mục —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-lg border border-slate-200 p-1">
          {(['url', 'keyword'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setPreview(null); setInput(''); setError(null); }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                mode === m ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m === 'url' ? 'Theo link sản phẩm' : 'Theo từ khóa'}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
            placeholder={
              mode === 'url'
                ? 'https://tiki.vn/... hoặc https://shopee.vn/...'
                : 'iPhone 16 Pro Max 256GB'
            }
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={handlePreview}
            disabled={loading || !input.trim() || !categoryId}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Đang tìm…' : 'Tìm kiếm'}
          </button>
        </div>
        {!categoryId && input && (
          <p className="mt-1.5 text-xs text-amber-600">Vui lòng chọn danh mục trước khi tìm kiếm</p>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Save result ── */}
      {saveResult && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Đã lưu thành công</p>
          <p className="mt-1 text-sm text-green-700">
            <strong>{saveResult.productName}</strong> — {saveResult.priceEntriesCount} nguồn giá
          </p>
          <a
            href={`/san-pham/${saveResult.productSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-green-600 underline hover:text-green-800"
          >
            Xem trang sản phẩm
          </a>
        </div>
      )}

      {/* ── Preview results ── */}
      {preview && (
        <div className="space-y-5">
          {/* Primary product (URL mode) */}
          {preview.primary && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Sản phẩm từ link ({PLATFORM_LABELS[preview.primary.source] ?? preview.primary.source})
              </h2>
              <ProductCard
                product={preview.primary}
                selected={isSelected(preview.primary)}
                onToggle={() => toggleProduct(preview.primary!)}
                isPrimary={isPrimary(preview.primary)}
              />
            </section>
          )}

          {/* Cross-platform results */}
          {preview.platformResults.map((r) => (
            <section key={r.platform}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {PLATFORM_LABELS[r.platform] ?? r.platform}
                {r.products.length === 0 && (
                  <span className="ml-2 text-xs font-normal normal-case text-slate-400">
                    {r.error ?? 'Không tìm thấy kết quả'}
                  </span>
                )}
              </h2>
              {r.products.length > 0 && (
                <div className="space-y-2">
                  {r.products.map((p) => (
                    <div key={p.externalId} className="relative">
                      <ProductCard
                        product={p}
                        selected={isSelected(p)}
                        onToggle={() => toggleProduct(p)}
                        isPrimary={isPrimary(p)}
                      />
                      {isSelected(p) && !isPrimary(p) && (
                        <button
                          onClick={() => makePrimary(p)}
                          className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-primary-600"
                        >
                          Đặt làm chính
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* Save bar */}
          <div className="sticky bottom-0 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Đã chọn <strong>{selected.size}</strong> nguồn giá —{' '}
                {selectedCategory ? (
                  <span>
                    danh mục <strong>{selectedCategory.name}</strong>
                  </span>
                ) : (
                  <span className="text-amber-600">chưa chọn danh mục</span>
                )}
              </p>
              <button
                onClick={handleSave}
                disabled={saving || selected.size === 0 || !categoryId}
                className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Đang lưu…' : `Lưu sản phẩm (${selected.size} nguồn)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
