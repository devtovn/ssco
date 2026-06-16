'use client';

import { useRef, useState } from 'react';
import { getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';

interface ImportError {
  row: number;
  sku?: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  platform: string;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: ImportError[];
}

function formatFetchError(err: unknown): string {
  if (!(err instanceof Error)) return 'Import thất bại';
  if (err.message === 'Failed to fetch') {
    return (
      'Không kết nối được server (Failed to fetch). ' +
      'Kiểm tra backend đang chạy, restart sau khi cập nhật JSON_BODY_LIMIT=100mb, ' +
      'và đợi vài phút — file ~50MB cần thời gian upload + xử lý.'
    );
  }
  return err.message;
}

export function ProductImportPanel({ embedded = false }: { embedded?: boolean }) {
  const [platform, setPlatform] = useState<'tiki'>('tiki');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setError(null);
    setResult(null);
  }

  async function handleImport() {
    if (!file) {
      setError('Chọn file CSV trước khi import');
      return;
    }

    const token = getToken();
    if (!token) {
      setError('Chưa đăng nhập');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        buildApiUrl('/admin/import/products', { platform }),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'text/csv; charset=utf-8',
          },
          body: file,
        }
      );

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error?.message ?? json.message ?? json.error ?? 'Import thất bại');
      }
      setResult(json as ImportResult);
    } catch (e: unknown) {
      setError(formatFetchError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={embedded ? 'mx-auto max-w-2xl space-y-6' : 'mx-auto max-w-2xl space-y-6'}>
      {!embedded && (
        <div>
          <h1 className="text-xl font-bold text-slate-900">Import sản phẩm CSV</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload file export affiliate — sản phẩm import ở trạng thái nháp (chưa publish)
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700">Nguồn</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'tiki')}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="tiki">Tiki (tiki.vn.csv)</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-700">File CSV</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
          />
          {file && (
            <p className="mt-1 text-xs text-slate-500">
              Đã chọn: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
        </div>

        <p className="mb-4 text-xs text-slate-500">
          Cột bắt buộc: sku, name, url, price, discount, image, desc, category, keywords. Giá lấy từ{' '}
          <code className="rounded bg-slate-100 px-1">discount</code>;{' '}
          <code className="rounded bg-slate-100 px-1">category</code> là tên danh mục (tự tạo nếu chưa có);{' '}
          <code className="rounded bg-slate-100 px-1">keywords</code> ghi vào{' '}
          <code className="rounded bg-slate-100 px-1">products.keywords</code>.
          File lớn (~50MB) có thể mất vài phút — không đóng tab.
        </p>

        <button
          type="button"
          onClick={handleImport}
          disabled={loading || !file}
          className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Đang import… (có thể mất vài phút)' : 'Import'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Kết quả import</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>
              Tạo mới: <strong>{result.created}</strong>
            </li>
            <li>
              Cập nhật: <strong>{result.updated}</strong>
            </li>
            <li>
              Lỗi: <strong className={result.failed > 0 ? 'text-red-600' : ''}>{result.failed}</strong>
            </li>
          </ul>
          {result.errors.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-red-100 bg-red-50/50 p-3">
              <p className="text-xs font-medium text-red-800">Chi tiết lỗi</p>
              <ul className="mt-2 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-700">
                    Dòng {err.row}
                    {err.sku ? ` (sku ${err.sku})` : ''}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
