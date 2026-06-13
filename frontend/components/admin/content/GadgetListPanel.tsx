'use client';

import { useState, useEffect } from 'react';
import { apiFetchWithAuth, getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';
import {
  adminPost,
  CATEGORY_LABELS,
  type Brand,
  type Device,
  type ProductResult,
} from './gadget-admin-shared';

export function GadgetListPanel() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState('');

  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string; productId?: string } | null>(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);

  const [resyncingId, setResyncingId] = useState<string | null>(null);
  const [resyncMsg, setResyncMsg] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const [filterName, setFilterName] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished'>('all');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [linkSaving, setLinkSaving] = useState(false);

  useEffect(() => {
    fetch(buildApiUrl('/gadget/brands'))
      .then((r) => r.json())
      .then(setBrands)
      .catch((err) => console.error('[GadgetListPanel] brands', err));
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      const data = await apiFetchWithAuth<{ devices: Device[] }>('/admin/gadget/devices');
      setDevices(data.devices ?? []);
    } catch (err) {
      console.error('[loadDevices]', err);
    }
  }

  async function handlePublish(id: string, published: boolean) {
    try {
      await adminPost(`/admin/gadget/devices/${id}/publish`, { published });
      await loadDevices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi publish');
    }
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
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Lỗi xóa');
      }
      setDeleteDialog(null);
      await loadDevices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi xóa');
    } finally {
      setDeleteDeleting(false);
    }
  }

  async function searchProducts(q: string) {
    if (q.trim().length < 2) {
      setProductResults([]);
      return;
    }
    try {
      const token = getToken();
      const res = await fetch(buildApiUrl('/search', { keyword: q, limit: '8' }), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const items = json.results ?? json.data?.results ?? [];
      setProductResults(
        items.map((p: { id: unknown; name: string; slug: string }) => ({
          id: String(p.id),
          name: p.name,
          slug: p.slug,
        }))
      );
    } catch (err) {
      console.error('[searchProducts]', err);
      setProductResults([]);
    }
  }

  async function handleResync(deviceId: string) {
    setResyncingId(deviceId);
    setResyncMsg(null);
    try {
      await adminPost(`/admin/gadget/devices/${deviceId}/resync`, {});
      setResyncMsg({ id: deviceId, ok: true, msg: '✅ Resync thành công' });
      await loadDevices();
    } catch (e: unknown) {
      setResyncMsg({
        id: deviceId,
        ok: false,
        msg: `❌ ${e instanceof Error ? e.message : 'Lỗi resync'}`,
      });
    } finally {
      setResyncingId(null);
    }
  }

  async function handleLinkProduct(deviceId: string, productId: string | null) {
    setLinkSaving(true);
    try {
      await adminPost(`/admin/gadget/devices/${deviceId}/link-product`, { productId });
      setLinkingId(null);
      setProductSearch('');
      setProductResults([]);
      await loadDevices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi liên kết');
    } finally {
      setLinkSaving(false);
    }
  }

  const filteredDevices = devices.filter((d) => {
    if (filterName && !d.name.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterBrand && d.brandName !== filterBrand) return false;
    if (filterStatus === 'published' && !d.isPublished) return false;
    if (filterStatus === 'unpublished' && d.isPublished) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedDevices = filteredDevices.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Xóa thiết bị</h3>
            <p className="mt-2 text-sm text-slate-600">
              Bạn đang xóa <span className="font-medium text-slate-900">&quot;{deleteDialog.name}&quot;</span>.
            </p>
            {deleteDialog.productId && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Thiết bị này có sản phẩm liên kết. Bạn có muốn xóa luôn sản phẩm không?
              </p>
            )}
            <div className="mt-5 flex flex-col gap-2">
              {deleteDialog.productId && (
                <button
                  type="button"
                  onClick={() => confirmDelete(true)}
                  disabled={deleteDeleting}
                  className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                >
                  {deleteDeleting ? 'Đang xóa…' : 'Xóa cả thiết bị lẫn sản phẩm'}
                </button>
              )}
              <button
                type="button"
                onClick={() => confirmDelete(false)}
                disabled={deleteDeleting}
                className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-slate-500"
                autoFocus
              >
                {deleteDeleting
                  ? 'Đang xóa…'
                  : deleteDialog.productId
                    ? 'Không — chỉ xóa thiết bị'
                    : 'Xác nhận xóa'}
              </button>
              <button
                type="button"
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-800">
            Danh sách thiết bị
            <span className="ml-2 text-sm font-normal text-slate-400">
              {filteredDevices.length !== devices.length
                ? `${filteredDevices.length} / ${devices.length}`
                : devices.length}
            </span>
          </h2>
          <a
            href="/gadget"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:underline"
          >
            Xem trang thiết bị ↗
          </a>
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-sm text-red-600">{error}</div>
        )}

        <div className="flex flex-wrap gap-3 border-b border-slate-100 px-5 py-3">
          <input
            type="text"
            value={filterName}
            onChange={(e) => {
              setFilterName(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên..."
            className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          />
          <select
            value={filterBrand}
            onChange={(e) => {
              setFilterBrand(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="">Tất cả hãng</option>
            {brands.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as typeof filterStatus);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
          {(filterName || filterBrand || filterStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setFilterName('');
                setFilterBrand('');
                setFilterStatus('all');
                setPage(1);
              }}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {pagedDevices.map((d) => (
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
                      🔗 Liên kết:{' '}
                      <a
                        href={`/san-pham/${d.productSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {d.productSlug}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleLinkProduct(d.id, null)}
                        className="ml-2 text-red-400 hover:text-red-600"
                      >
                        ✕ Huỷ
                      </button>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setLinkingId(d.id);
                        setProductSearch('');
                        setProductResults([]);
                      }}
                      className="mt-0.5 text-xs text-amber-600 hover:underline"
                    >
                      ⚠️ Chưa liên kết sản phẩm — Click để liên kết
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      d.isPublished ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {d.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePublish(d.id, !d.isPublished)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {d.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResync(d.id)}
                    disabled={resyncingId === d.id}
                    title="Crawl lại GSMArena và cập nhật thông số kỹ thuật"
                    className="text-xs text-amber-600 hover:text-amber-800 disabled:opacity-40"
                  >
                    {resyncingId === d.id ? '⏳' : '🔄 Resync'}
                  </button>
                  <a
                    href={
                      d.isPublished
                        ? `/gadget/${d.brandSlug}/${d.slug}`
                        : `/admin/gadget/preview/${d.slug}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs hover:underline ${
                      d.isPublished ? 'text-slate-400 hover:text-primary-600' : 'text-amber-500 hover:text-amber-700'
                    }`}
                  >
                    {d.isPublished ? 'Xem ↗' : 'Preview ↗'}
                  </a>
                  {d.gsmarenaUrl && (
                    <a
                      href={d.gsmarenaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-600"
                      title="GSMArena"
                    >
                      GSM ↗
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id, d.name, d.productId)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              {resyncMsg?.id === d.id && (
                <p className={`mt-1.5 text-xs ${resyncMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {resyncMsg.msg}
                </p>
              )}

              {linkingId === d.id && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-medium text-amber-800">
                    Tìm và liên kết với sản phẩm trong DB:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        searchProducts(e.target.value);
                      }}
                      placeholder="Nhập tên sản phẩm..."
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setLinkingId(null)}
                      className="px-2 text-xs text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                  {productResults.length > 0 && (
                    <div className="mt-2 divide-y rounded-lg border border-slate-200 bg-white">
                      {productResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleLinkProduct(d.id, p.id)}
                          disabled={linkSaving}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary-50"
                        >
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

        {filteredDevices.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              >
                {[10, 20, 50, 100, 200, 500].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>/ trang · {filteredDevices.length} thiết bị</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                .reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p as number)}
                      className={`rounded px-2.5 py-1 text-sm ${
                        safePage === p
                          ? 'bg-primary-600 font-medium text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
