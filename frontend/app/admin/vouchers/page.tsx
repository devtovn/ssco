'use client';

import { useEffect, useState } from 'react';
import {
  fetchAllVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  type Voucher,
  type VoucherInput,
  type VoucherSource,
  type VoucherType,
} from '@/lib/api/vouchers';

const SOURCES: VoucherSource[] = ['tiki', 'shopee', 'lazada', 'tiktok'];
const TYPES: { value: VoucherType; label: string }[] = [
  { value: 'cashback', label: 'Hoàn tiền' },
  { value: 'shipping', label: 'Freeship' },
  { value: 'discount', label: 'Giảm giá' },
];
const TYPE_BADGE: Record<VoucherType, string> = {
  cashback: 'bg-amber-100 text-amber-800',
  shipping:  'bg-green-100 text-green-800',
  discount:  'bg-primary-100 text-primary-800',
};

const EMPTY_FORM: VoucherInput = {
  code: '', description: '', source: 'tiki', type: 'discount', expires_at: '', is_active: true,
};

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState<VoucherInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setVouchers(await fetchAllVouchers());
      setError('');
    } catch {
      setError('Không tải được danh sách voucher');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(v: Voucher) {
    setEditing(v);
    setForm({
      code: v.code,
      description: v.description,
      source: v.source,
      type: v.type,
      expires_at: v.expires_iso ?? '',
      is_active: v.is_active ?? true,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.code || !form.description || !form.expires_at) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateVoucher(editing.id, form);
      } else {
        await createVoucher(form);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteVoucher(id);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Voucher</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý mã giảm giá hiển thị trên website</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          + Thêm voucher
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              {editing ? 'Chỉnh sửa voucher' : 'Thêm voucher mới'}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Mã voucher</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="VD: SALE50K"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Sàn</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value as VoucherSource })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
                  >
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="VD: Giảm 50k cho đơn từ 500k"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Loại</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as VoucherType })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Hết hạn</label>
                  <input
                    type="date"
                    min={today}
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded"
                />
                Hiển thị (active)
              </label>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowForm(false); setError(''); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Xóa voucher?</h2>
            <p className="mt-2 text-sm text-slate-600">Hành động này không thể hoàn tác.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Đang tải...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Mã</th>
                <th className="px-4 py-3 text-left">Mô tả</th>
                <th className="px-4 py-3 text-left">Sàn</th>
                <th className="px-4 py-3 text-left">Loại</th>
                <th className="px-4 py-3 text-left">Hết hạn</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Chưa có voucher nào.
                  </td>
                </tr>
              )}
              {vouchers.map((v) => {
                const expired = v.expires_iso ? v.expires_iso < today : false;
                return (
                  <tr key={v.id} className={expired ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{v.code}</td>
                    <td className="px-4 py-3 text-slate-700">{v.description}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{v.source}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${TYPE_BADGE[v.type]}`}>
                        {TYPES.find((t) => t.value === v.type)?.label}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${expired ? 'text-red-500' : 'text-slate-600'}`}>
                      {v.expires}
                      {expired && <span className="ml-1 text-xs">(hết hạn)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {v.is_active ? 'Hiển thị' : 'Ẩn'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(v)}
                          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => setDeleteId(v.id)}
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
