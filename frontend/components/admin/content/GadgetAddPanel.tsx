'use client';

import { useState, useEffect } from 'react';
import { buildApiUrl } from '@/lib/api/client';
import {
  adminPost,
  CATEGORY_LABELS,
  type Brand,
  type Category,
  type CrawlResult,
  type GadgetInputMode,
  type SearchResult,
} from './gadget-admin-shared';

export function GadgetAddPanel() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [inputMode, setInputMode] = useState<GadgetInputMode>('url');
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');

  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const [brandId, setBrandId] = useState('');
  const [publishProduct, setPublishProduct] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    fetch(buildApiUrl('/gadget/brands'))
      .then((r) => r.json())
      .then(setBrands)
      .catch((err) => console.error('[GadgetAddPanel] brands', err));
    fetch(buildApiUrl('/categories/tree'))
      .then((r) => r.json())
      .then((res: unknown) => {
        const tree = (res as { data?: unknown })?.data ?? res;
        if (!Array.isArray(tree)) return;
        const flat: Category[] = [];
        const walk = (nodes: unknown[], parentId?: string) => {
          for (const n of nodes) {
            const node = n as { category?: Category; children?: unknown[] };
            const cat = node.category ?? (n as Category);
            flat.push({
              id: String(cat.id),
              name: cat.name,
              slug: cat.slug,
              parentId,
            });
            if (node.children?.length) walk(node.children, String(cat.id));
          }
        };
        walk(tree);
        setCategories(flat);
      })
      .catch((err) => console.error('[GadgetAddPanel] categories', err));
  }, []);

  async function handleSearch() {
    if (!keyword.trim()) return;
    setError('');
    setSearchResults([]);
    setSelectedResult(null);
    setCrawlResult(null);
    setSearching(true);
    try {
      const results: SearchResult[] = await adminPost('/admin/gadget/search', {
        keyword: keyword.trim(),
      });
      setSearchResults(results);
      if (!results.length) {
        setError(
          'Không tìm thấy kết quả trên GSMArena cho từ khóa này. ' +
            'Thử tab "Nhập link" hoặc dán URL trực tiếp từ trình duyệt.'
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tìm kiếm');
    } finally {
      setSearching(false);
    }
  }

  function handleSelectResult(r: SearchResult) {
    setSelectedResult(r);
    setSearchResults([]);
  }

  async function handleCrawl() {
    const targetUrl = inputMode === 'keyword' ? (selectedResult?.url ?? '') : url.trim();
    if (!targetUrl) return;
    setError('');
    setCrawlResult(null);
    setCrawling(true);
    try {
      const result: CrawlResult = await adminPost('/admin/gadget/crawl', { url: targetUrl });
      setCrawlResult(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi crawl');
    } finally {
      setCrawling(false);
    }
  }

  async function handleSave() {
    if (!crawlResult || !brandId) return;
    setSaving(true);
    setError('');
    try {
      const slug = crawlResult.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const savedDevice = await adminPost('/admin/gadget/devices', {
        brandId,
        name: crawlResult.name,
        slug,
        category: crawlResult.category,
        imageUrl: crawlResult.imageUrl,
        gsmarenaUrl: crawlResult.gsmarenaUrl,
        announced: crawlResult.announced,
        released: crawlResult.released,
        status: crawlResult.status,
        specs: crawlResult.specs,
        isPublished: false,
        publishProduct,
        categoryId: publishProduct && categoryId ? categoryId : undefined,
      });
      setSaved(
        savedDevice.isPublished
          ? `✅ Đã publish "${crawlResult.name}"`
          : `💾 Đã lưu "${crawlResult.name}" — chờ review và publish`
      );
      setCrawlResult(null);
      setSelectedResult(null);
      setKeyword('');
      setUrl('');
      setPublishProduct(true);
      setCategoryId('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  }

  const specCount = crawlResult
    ? Object.values(crawlResult.specs).reduce((s, g) => s + Object.keys(g).length, 0)
    : 0;

  const inputModes: GadgetInputMode[] = ['url', 'keyword'];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-semibold text-slate-800">Thêm thiết bị từ GSMArena</h2>
        <a
          href="/gadget"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm text-primary-600 hover:underline"
        >
          Xem trang thiết bị ↗
        </a>
      </div>

      <div className="mb-4 flex w-fit rounded-lg border border-slate-200 p-1">
        {inputModes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setInputMode(m);
              setSearchResults([]);
              setSelectedResult(null);
              setCrawlResult(null);
              setError('');
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              inputMode === m ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {m === 'url' ? '🔗 Nhập link' : '🔍 Từ khóa'}
          </button>
        ))}
      </div>

      {inputMode === 'keyword' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Vd: iPhone 17 Pro Max, Galaxy S25 Ultra..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={!keyword.trim() || searching}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
            >
              {searching ? 'Đang tìm…' : 'Tìm'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
              <p className="px-4 py-2 text-xs font-medium text-slate-500">
                {searchResults.length} kết quả — chọn thiết bị muốn crawl:
              </p>
              {searchResults.map((r) => (
                <button
                  key={r.url}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50"
                >
                  {r.imageUrl && (
                    <img src={r.imageUrl} alt={r.name} className="h-10 w-10 shrink-0 object-contain" />
                  )}
                  <span className="text-sm font-medium text-slate-900">{r.name}</span>
                </button>
              ))}
            </div>
          )}

          {selectedResult && !crawlResult && (
            <div className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
              <div className="flex items-center gap-3">
                {selectedResult.imageUrl && (
                  <img
                    src={selectedResult.imageUrl}
                    alt={selectedResult.name}
                    className="h-10 w-10 object-contain"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedResult.name}</p>
                  <p className="max-w-xs truncate text-xs text-slate-500">{selectedResult.url}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedResult(null)}
                  className="text-xs text-slate-400 hover:text-red-500"
                >
                  Đổi
                </button>
                <button
                  type="button"
                  onClick={handleCrawl}
                  disabled={crawling}
                  className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
                >
                  {crawling ? 'Đang crawl…' : '⚡ Crawl specs'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {inputMode === 'url' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Dán link từ GSMArena, vd:{' '}
            <code className="rounded bg-slate-100 px-1">
              https://www.gsmarena.com/apple_iphone_17_pro_max-13964.php
            </code>
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
              placeholder="https://www.gsmarena.com/..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCrawl}
              disabled={!url.trim() || crawling}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
            >
              {crawling ? 'Đang crawl…' : '⚡ Crawl'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm text-green-600">{saved}</p>}

      {crawlResult && (
        <div className="mt-5 space-y-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-4">
            {crawlResult.imageUrl && (
              <img
                src={crawlResult.imageUrl}
                alt={crawlResult.name}
                className="h-20 w-20 shrink-0 object-contain"
              />
            )}
            <div>
              <p className="font-semibold text-slate-900">{crawlResult.name}</p>
              <p className="text-xs text-slate-600">
                {CATEGORY_LABELS[crawlResult.category]} · {specCount} thông số
                {crawlResult.announced && ` · ${crawlResult.announced}`}
              </p>
              {crawlResult.status && <p className="text-xs text-slate-500">{crawlResult.status}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Hãng</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm sm:w-auto"
            >
              <option value="">— Chọn hãng —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
              publishProduct ? 'border-green-200 bg-white' : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div>
              <p className="text-sm font-medium text-slate-800">Publish sản phẩm đi kèm?</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {publishProduct
                  ? 'Tạo & hiển thị sản phẩm trên trang chủ'
                  : 'Chỉ lưu gadget, không tạo sản phẩm công khai'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPublishProduct((p) => !p);
                setCategoryId('');
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                publishProduct ? 'bg-green-500' : 'bg-slate-300'
              }`}
              aria-pressed={publishProduct}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  publishProduct ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {publishProduct && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <label className="mb-1.5 block text-xs font-medium text-blue-800">Danh mục sản phẩm</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm sm:w-auto"
              >
                <option value="">— Chọn danh mục —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `  ↳ ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-green-200 pt-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!brandId || saving}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
            >
              {saving ? 'Đang lưu…' : publishProduct ? '💾 Lưu thiết bị & sản phẩm' : '💾 Lưu thiết bị (ẩn)'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCrawlResult(null);
                setSelectedResult(null);
                setPublishProduct(true);
                setCategoryId('');
              }}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
