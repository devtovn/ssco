'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { buildApiUrl } from '@/lib/api/client';
import { SpecsTable } from '@/components/gadget/SpecsTable';
import type { GadgetDevice } from '@/lib/api/gadget';

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

export default function GadgetPreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [device, setDevice] = useState<GadgetDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  const fetchDevice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/admin/gadget/devices/by-slug/${slug}`), {
        headers: authHeaders(),
      });
      if (res.ok) setDevice(await res.json());
      else setDevice(null);
    } catch { setDevice(null); }
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchDevice(); }, [fetchDevice]);

  async function handlePublish(publish: boolean) {
    if (!device) return;
    setPublishing(true);
    setPublishMsg(null);
    try {
      const res = await fetch(buildApiUrl(`/admin/gadget/devices/${device.id}/publish`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ published: publish }),
      });
      if (res.ok) {
        setDevice((d) => d ? { ...d, isPublished: publish } : d);
        setPublishMsg(publish ? '✅ Đã publish!' : '⬇️ Đã unpublish');
      } else {
        setPublishMsg('❌ Lỗi khi thay đổi trạng thái');
      }
    } catch { setPublishMsg('❌ Lỗi kết nối'); }
    setPublishing(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Đang tải…
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
        <p>Không tìm thấy thiết bị.</p>
        <Link href="/admin/content/add?tab=gadget&view=list" className="text-sm text-primary-600 underline">← Quay lại danh sách</Link>
      </div>
    );
  }

  const publicUrl = `/gadget/${device.brandSlug}/${device.slug}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky review bar ─────────────────────────────────── */}
      <div className={`sticky top-0 z-50 flex items-center justify-between gap-4 px-4 py-2.5 shadow-md ${
        device.isPublished ? 'bg-green-700' : 'bg-amber-600'
      }`}>
        <div className="flex items-center gap-3 text-white">
          <Link
            href="/admin/content/add?tab=gadget&view=list"
            className="text-white/80 hover:text-white text-sm"
          >
            ← Danh sách
          </Link>
          <span className="text-white/40">|</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            device.isPublished ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
          }`}>
            {device.isPublished ? 'PUBLISHED' : 'DRAFT'}
          </span>
          <span className="text-sm font-semibold text-white">{device.name}</span>
          {publishMsg && <span className="text-sm text-white/90">{publishMsg}</span>}
        </div>
        <div className="flex items-center gap-2">
          {device.isPublished && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
            >
              Xem trang public ↗
            </a>
          )}
          {device.isPublished ? (
            <button
              onClick={() => handlePublish(false)}
              disabled={publishing}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 disabled:opacity-50"
            >
              {publishing ? '⏳' : 'Unpublish'}
            </button>
          ) : (
            <button
              onClick={() => handlePublish(true)}
              disabled={publishing}
              className="rounded-lg bg-white px-4 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              {publishing ? '⏳ Đang publish…' : '🚀 Publish ngay'}
            </button>
          )}
        </div>
      </div>

      {/* ── Device content (giống trang public) ──────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          {device.imageUrl && (
            <img src={device.imageUrl} alt={device.name} className="h-24 w-20 object-contain" />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-600">{device.brandName}</p>
            <h1 className="text-2xl font-bold text-slate-900">{device.name}</h1>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
              {device.announced && <span>📅 {device.announced}</span>}
              {device.gsmarenaUrl && (
                <a href={device.gsmarenaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                  GSMArena ↗
                </a>
              )}
              {device.productSlug && (
                <a href={`/san-pham/${device.productSlug}`} target="_blank" rel="noopener noreferrer" className="text-green-600 underline">
                  Trang sản phẩm ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Specs */}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Thông số kỹ thuật đầy đủ
          </div>
          <SpecsTable specs={device.specs} />
        </div>
      </div>
    </div>
  );
}
