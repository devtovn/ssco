'use client';

import { useState, useEffect } from 'react';
import { apiFetchWithAuth, getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';

interface Brand { id: string; name: string; slug: string; }
interface Category { id: string; name: string; slug: string; parentId?: string; }
interface SearchResult { name: string; url: string; imageUrl?: string; }
interface CrawlResult {
  name: string; imageUrl?: string; gsmarenaUrl: string;
  announced?: string; released?: string; status?: string;
  category: 'mobile' | 'tablet' | 'smartwatch';
  specs: Record<string, Record<string, string>>;
}
interface Device {
  id: string; name: string; slug: string; category: string;
  isPublished: boolean; brandName?: string; brandSlug?: string; announced?: string;
  productId?: string; productSlug?: string;
}
interface ProductResult { id: string; name: string; slug: string; }

async function adminPost(path: string, body: unknown) {
  const token = getToken();
  const res = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? json.message ?? 'Lỗi server');
  return json;
}

const CATEGORY_LABELS: Record<string, string> = {
  mobile: '📱 Điện thoại', tablet: '📲 Máy tính bảng', smartwatch: '⌚ Đồng hồ',
};

type InputMode = 'keyword' | 'url';

export default function AdminGadgetPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);

  // Input state
  const [inputMode, setInputMode] = useState<InputMode>('keyword');
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');

  // Search results (keyword mode)
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  // Crawl
  const [crawling, setCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  // Save
  const [brandId, setBrandId] = useState('');
  const [publishProduct, setPublishProduct] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  // Delete confirm dialog
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string; productId?: string } | null>(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);

  // Resync
  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [resyncMsg, setResyncMsg] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  // Device list filters
  const [filterName, setFilterName] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished'>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Link product
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);

  useEffect(() => {
    fetch(buildApiUrl('/gadget/brands'))
      .then(r => r.json()).then(setBrands).catch((err) => { console.error('[AdminGadgetPage] brands', err); });
    fetch(buildApiUrl('/categories/tree'))
      .then(r => r.json()).then((res: any) => {
        const tree: any[] = res?.data ?? res;
        if (!Array.isArray(tree)) return;
        const flat: Category[] = [];
        const walk = (nodes: any[], parentId?: string) => {
          for (const n of nodes) {
            const cat = n.category ?? n;
            flat.push({ id: String(cat.id), name: cat.name, slug: cat.slug, parentId });
            if (n.children?.length) walk(n.children, String(cat.id));
          }
        };
        walk(tree);
        setCategories(flat);
      }).catch((err) => { console.error('[AdminGadgetPage] categories', err); });
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      const data = await apiFetchWithAuth<{ devices: Device[] }>('/admin/gadget/devices');
      setDevices(data.devices ?? []);
    } catch (err) { console.error('[loadDevices]', err); }
  }

  // Step 1a: keyword search
  async function handleSearch() {
    if (!keyword.trim()) return;
    setError(''); setSearchResults([]); setSelectedResult(null); setCrawlResult(null);
    setSearching(true);
    try {
      const results: SearchResult[] = await adminPost('/admin/gadget/search', { keyword: keyword.trim() });
      setSearchResults(results);
      if (!results.length) setError('Không tìm thấy kết quả trên GSMArena.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }

  // Step 1b: select a search result → auto-fill URL
  function handleSelectResult(r: SearchResult) {
    setSelectedResult(r);
    setSearchResults([]);
  }

  // Step 2: crawl the URL (either from search selection or direct URL input)
  async function handleCrawl() {
    const targetUrl = inputMode === 'keyword'
      ? (selectedResult?.url ?? '')
      : url.trim();
    if (!targetUrl) return;
    setError(''); setCrawlResult(null); setCrawling(true);
    try {
      const result: CrawlResult = await adminPost('/admin/gadget/crawl', { url: targetUrl });
      setCrawlResult(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCrawling(false);
    }
  }

  // Step 3: save
  async function handleSave() {
    if (!crawlResult || !brandId) return;
    setSaving(true); setError('');
    try {
      const slug = crawlResult.name
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const saved = await adminPost('/admin/gadget/devices', {
        brandId, name: crawlResult.name, slug,
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
        saved.isPublished
          ? `✅ Đã publish "${crawlResult.name}"`
          : `💾 Đã lưu "${crawlResult.name}" — chờ review và publish`
      );
      setCrawlResult(null); setSelectedResult(null); setKeyword(''); setUrl('');
      setPublishProduct(true); setCategoryId('');
      await loadDevices();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(id: string, published: boolean) {
    try {
      await adminPost(`/admin/gadget/devices/${id}/publish`, { published });
      await loadDevices();
    } catch (e: any) { setError(e.message); }
  }

  function handleDelete(id: string, name: string, productId?: string) {
    setDeleteDialog({ id, name, productId });
  }

  async function confirmDelete(deleteProduct: boolean) {
    if (!deleteDialog) return;
    setDeleteDeleting(true);
    try {
      const token = getToken();
      const res = await fetch(buildApiUrl(`/admin/gadget/devices/${deleteDialog.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteProduct }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Lỗi xóa'); }
      setDeleteDialog(null);
      await loadDevices();
    } catch (e: any) { setError(e.message); }
    finally { setDeleteDeleting(false); }
  }

  async function searchProducts(q: string) {
    if (q.trim().length < 2) { setProductResults([]); return; }
    try {
      const token = getToken();
      const res = await fetch(buildApiUrl('/search', { keyword: q, limit: '8' }), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const items = json.results ?? json.data?.results ?? [];
      setProductResults(items.map((p: any) => ({ id: String(p.id), name: p.name, slug: p.slug })));
    } catch (err) { console.error('[searchProducts]', err); setProductResults([]); }
  }

  async function handleResync(deviceId: string) {
    setResyncingId(deviceId);
    setResyncMsg(null);
    try {
      await adminPost(`/admin/gadget/devices/${deviceId}/resync`, {});
      setResyncMsg({ id: deviceId, ok: true, msg: '✅ Resync thành công' });
      await loadDevices();
    } catch (e: any) {
      setResyncMsg({ id: deviceId, ok: false, msg: `❌ ${e.message}` });
    } finally {
      setResyncingId(null);
    }
  }

  async function handleLinkProduct(deviceId: string, productId: string | null) {
    setLinkSaving(true);
    try {
      await adminPost(`/admin/gadget/devices/${deviceId}/link-product`, { productId });
      setLinkingId(null); setProductSearch(''); setProductResults([]);
      await loadDevices();
    } catch (e: any) { setError(e.message); }
    finally { setLinkSaving(false); }
  }

  const filteredDevices = devices.filter(d => {
    if (filterName && !d.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterBrand && d.brandName !== filterBrand) return false;
    if (filterStatus === 'published' && !d.isPublished) return false;
    if (filterStatus === 'unpublished' && d.isPublished) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedDevices = filteredDevices.slice((safePage - 1) * pageSize, safePage * pageSize);

  const specCount = crawlResult
    ? Object.values(crawlResult.specs).reduce((s, g) => s + Object.keys(g).length, 0)
    : 0;

  const readyToCrawl = inputMode === 'keyword'
    ? !!selectedResult
    : !!url.trim();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">📱 Quản lý Thiết bị</h1>
        <a href="/gadget" target="_blank" rel="noopener noreferrer"
           className="text-sm text-primary-600 hover:underline">Xem trang thiết bị ↗</a>
      </div>

      {/* ── Seed section ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Thêm thiết bị từ GSMArena</h2>

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-lg border border-slate-200 p-1 w-fit">
          {(['keyword', 'url'] as InputMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setInputMode(m); setSearchResults([]); setSelectedResult(null); setCrawlResult(null); setError(''); }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${inputMode === m ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {m === 'keyword' ? '🔍 Tìm theo từ khóa' : '🔗 Nhập link trực tiếp'}
            </button>
          ))}
        </div>

        {/* Keyword mode */}
        {inputMode === 'keyword' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Vd: iPhone 17 Pro Max, Galaxy S25 Ultra..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={!keyword.trim() || searching}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
              >
                {searching ? 'Đang tìm…' : 'Tìm'}
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                <p className="px-4 py-2 text-xs font-medium text-slate-500">
                  {searchResults.length} kết quả — chọn thiết bị muốn crawl:
                </p>
                {searchResults.map((r) => (
                  <button
                    key={r.url}
                    onClick={() => handleSelectResult(r)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50"
                  >
                    {r.imageUrl && (
                      <img src={r.imageUrl} alt={r.name} className="h-10 w-10 object-contain shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-900">{r.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected result */}
            {selectedResult && !crawlResult && (
              <div className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  {selectedResult.imageUrl && (
                    <img src={selectedResult.imageUrl} alt={selectedResult.name} className="h-10 w-10 object-contain" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedResult.name}</p>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{selectedResult.url}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedResult(null)}
                    className="text-xs text-slate-400 hover:text-red-500"
                  >
                    Đổi
                  </button>
                  <button
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

        {/* URL mode */}
        {inputMode === 'url' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Dán link từ GSMArena, vd:{' '}
              <code className="rounded bg-slate-100 px-1">https://www.gsmarena.com/apple_iphone_17_pro_max-13964.php</code>
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCrawl()}
                placeholder="https://www.gsmarena.com/..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
              <button
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

        {/* Crawl result preview + save */}
        {crawlResult && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 space-y-4">
            {/* Device info */}
            <div className="flex items-start gap-4">
              {crawlResult.imageUrl && (
                <img src={crawlResult.imageUrl} alt={crawlResult.name} className="h-20 w-20 object-contain shrink-0" />
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

            {/* Brand */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Hãng</label>
              <select
                value={brandId}
                onChange={e => setBrandId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm sm:w-auto"
              >
                <option value="">— Chọn hãng —</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* Publish product toggle */}
            <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${publishProduct ? 'border-green-200 bg-white' : 'border-amber-200 bg-amber-50'}`}>
              <div>
                <p className="text-sm font-medium text-slate-800">Publish sản phẩm đi kèm?</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {publishProduct ? 'Tạo & hiển thị sản phẩm trên trang chủ' : 'Chỉ lưu gadget, không tạo sản phẩm công khai'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPublishProduct(p => !p); setCategoryId(''); }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${publishProduct ? 'bg-green-500' : 'bg-slate-300'}`}
                aria-pressed={publishProduct}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${publishProduct ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Category — only when publishProduct */}
            {publishProduct && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <label className="mb-1.5 block text-xs font-medium text-blue-800">Danh mục sản phẩm</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm sm:w-auto"
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? `  ↳ ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Divider + actions */}
            <div className="border-t border-green-200 pt-3 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!brandId || saving}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
              >
                {saving ? 'Đang lưu…' : publishProduct ? '💾 Lưu thiết bị & sản phẩm' : '💾 Lưu thiết bị (ẩn)'}
              </button>
              <button
                onClick={() => { setCrawlResult(null); setSelectedResult(null); setPublishProduct(true); setCategoryId(''); }}
                className="text-xs text-slate-400 hover:text-red-500"
              >
                Huỷ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirm dialog ── */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Xóa thiết bị</h3>
            <p className="mt-2 text-sm text-slate-600">
              Bạn đang xóa <span className="font-medium text-slate-900">"{deleteDialog.name}"</span>.
            </p>
            {deleteDialog.productId && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Thiết bị này có sản phẩm liên kết. Bạn có muốn xóa luôn sản phẩm không?
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              {deleteDialog.productId && (
                <button
                  onClick={() => confirmDelete(true)}
                  disabled={deleteDeleting}
                  className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                >
                  {deleteDeleting ? 'Đang xóa…' : 'Xóa cả thiết bị lẫn sản phẩm'}
                </button>
              )}
              <button
                onClick={() => confirmDelete(false)}
                disabled={deleteDeleting}
                className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-slate-500"
                autoFocus
              >
                {deleteDeleting ? 'Đang xóa…' : deleteDialog.productId ? 'Không — chỉ xóa thiết bị' : 'Xác nhận xóa'}
              </button>
              <button
                onClick={() => setDeleteDialog(null)}
                disabled={deleteDeleting}
                className="w-full rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-slate-600 disabled:opacity-40"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Device list ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-800">
            Danh sách thiết bị
            <span className="ml-2 text-sm font-normal text-slate-400">
              {filteredDevices.length !== devices.length
                ? `${filteredDevices.length} / ${devices.length}`
                : devices.length}
            </span>
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-3">
          <input
            type="text"
            value={filterName}
            onChange={e => { setFilterName(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên..."
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none w-48"
          />
          <select
            value={filterBrand}
            onChange={e => { setFilterBrand(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="">Tất cả hãng</option>
            {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
          {(filterName || filterBrand || filterStatus !== 'all') && (
            <button
              onClick={() => { setFilterName(''); setFilterBrand(''); setFilterStatus('all'); setPage(1); }}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {pagedDevices.map(d => (
            <div key={d.id} className="px-5 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500">
                    {d.brandName} · {CATEGORY_LABELS[d.category] ?? d.category}
                    {d.announced && ` · ${d.announced}`}
                  </p>
                  {d.productSlug ? (
                    <p className="mt-0.5 text-xs text-green-600">
                      🔗 Liên kết: <a href={`/san-pham/${d.productSlug}`} target="_blank" rel="noopener noreferrer" className="underline">{d.productSlug}</a>
                      <button onClick={() => handleLinkProduct(d.id, null)} className="ml-2 text-red-400 hover:text-red-600">✕ Huỷ</button>
                    </p>
                  ) : (
                    <button onClick={() => { setLinkingId(d.id); setProductSearch(''); setProductResults([]); }}
                      className="mt-0.5 text-xs text-amber-600 hover:underline">
                      ⚠️ Chưa liên kết sản phẩm — Click để liên kết
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <button onClick={() => handlePublish(d.id, !d.isPublished)} className="text-xs text-primary-600 hover:underline">
                    {d.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => handleResync(d.id)}
                    disabled={resyncingId === d.id}
                    title="Crawl lại GSMArena và cập nhật thông số kỹ thuật"
                    className="text-xs text-amber-600 hover:text-amber-800 disabled:opacity-40"
                  >
                    {resyncingId === d.id ? '⏳' : '🔄 Resync'}
                  </button>
                  {d.brandSlug && (
                    <a href={`/gadget/${d.brandSlug}/${d.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-primary-600">Xem ↗</a>
                  )}
                  <button onClick={() => handleDelete(d.id, d.name, d.productId)} className="text-xs text-red-400 hover:text-red-600">Xóa</button>
                </div>
              </div>

              {/* Resync result message */}
              {resyncMsg?.id === d.id && (
                <p className={`mt-1.5 text-xs ${resyncMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {resyncMsg.msg}
                </p>
              )}

              {/* Inline product link search */}
              {linkingId === d.id && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-medium text-amber-800">Tìm và liên kết với sản phẩm trong DB:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value); }}
                      placeholder="Nhập tên sản phẩm..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      autoFocus
                    />
                    <button onClick={() => setLinkingId(null)} className="text-xs text-slate-400 hover:text-red-500 px-2">✕</button>
                  </div>
                  {productResults.length > 0 && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white divide-y">
                      {productResults.map(p => (
                        <button key={p.id} onClick={() => handleLinkProduct(d.id, p.id)}
                          disabled={linkSaving}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary-50">
                          <span className="font-medium text-slate-900">{p.name}</span>
                          <span className="text-xs text-primary-600">Liên kết →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {!filteredDevices.length && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              {devices.length ? 'Không có thiết bị nào khớp bộ lọc.' : 'Chưa có thiết bị nào.'}
            </p>
          )}
        </div>

        {/* Pagination bar */}
        {filteredDevices.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              >
                {[10, 20, 50, 100, 200, 500].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span>/ trang · {filteredDevices.length} thiết bị</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >«</button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >‹</button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-slate-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`rounded px-2.5 py-1 text-sm ${safePage === p ? 'bg-primary-600 text-white font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >›</button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
