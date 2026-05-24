/* global React */
const { useState, useMemo } = React;

// ─── Search result card (horizontal layout) ─────────────────────────
function SearchResultCard({ p, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:shadow-md w-full"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 flex items-center justify-center">
        <PackageEmoji size={30} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-semibold text-slate-900">{p.name}</h3>
        {p.categoryName && <p className="mt-1 text-sm text-slate-500">{p.categoryName}</p>}
        {p.brand && <p className="mt-0.5 text-xs text-slate-400">{p.brand}</p>}
        <p className="mt-2 font-bold text-primary-600">{formatPrice(p.lowestPrice)}</p>
      </div>
    </button>
  );
}

// ─── Search filters sidebar ─────────────────────────────────────────
function SearchFilters({ filters, setFilters, brands, categories, priceRange }) {
  return (
    <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
      <h2 className="font-semibold text-slate-900">Bộ lọc</h2>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Sắp xếp</label>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="relevance">Liên quan nhất</option>
          <option value="price_asc">Giá thấp → cao</option>
          <option value="price_desc">Giá cao → thấp</option>
          <option value="popularity">Phổ biến</option>
          <option value="newest">Mới nhất</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Danh mục</label>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tất cả</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name} ({c.count})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Thương hiệu</label>
        <select
          value={filters.brand}
          onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Tất cả</option>
          {brands.map((b) => (
            <option key={b.name} value={b.name}>{b.name} ({b.count})</option>
          ))}
        </select>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-slate-700">Khoảng giá (VND)</span>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Từ"
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Đến"
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {priceRange && (
          <p className="mt-1 text-xs text-slate-500">
            {priceRange.min.toLocaleString("vi-VN")} – {priceRange.max.toLocaleString("vi-VN")} ₫
          </p>
        )}
      </div>
    </aside>
  );
}

// ─── Price comparison table ─────────────────────────────────────────
function PriceComparisonTable({ rows, lowestId, onGo, productId }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <th className="px-4 py-3 font-medium">Nguồn</th>
            <th className="px-4 py-3 font-medium">Giá</th>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isLowest = r.id === lowestId && r.isAvailable;
            return (
              <tr key={r.id} className={`border-b border-slate-100 last:border-0 ${isLowest ? "bg-primary-50/50" : ""}`}>
                <td className="px-4 py-3 font-medium capitalize text-slate-900">
                  {r.source}
                  {isLowest && (
                    <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Rẻ nhất
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-bold text-primary-700">{formatPrice(r.price)}</td>
                <td className="px-4 py-3">
                  {r.isAvailable ? <span className="text-green-600">Còn hàng</span> : <span className="text-slate-400">Hết hàng</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    disabled={!r.isAvailable}
                    onClick={() => onGo && r.isAvailable && onGo(`/di-toi-noi-ban?listing=${r.id}&product=${productId}`)}
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tới nơi bán →
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        Cập nhật: 23/05/2026, 14:32
      </p>
    </div>
  );
}

// ─── Inline-SVG line chart (matches Recharts look) ──────────────────
function PriceHistoryChart({ data, days, setDays, trend }) {
  const W = 600, H = 220, pad = { t: 10, r: 14, b: 26, l: 50 };
  const xs = data.map((_, i) => i);
  const ys = data.map(d => d.price);
  const minY = Math.min(...ys) * 0.97;
  const maxY = Math.max(...ys) * 1.03;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const x = (i) => pad.l + (i / (data.length - 1 || 1)) * innerW;
  const y = (v) => pad.t + innerH - ((v - minY) / (maxY - minY)) * innerH;

  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.price).toFixed(1)}`).join(" ");
  const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
  const trendLabel = trend === "increasing" ? "tăng" : trend === "decreasing" ? "giảm" : "ổn định";

  const fmtCompact = (v) => new Intl.NumberFormat("vi-VN", { notation: "compact", compactDisplay: "short" }).format(v);
  const yTicks = [minY, (minY + maxY) / 2, maxY];
  // Visible labels — every Nth point
  const labelStride = Math.max(1, Math.ceil(data.length / 6));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900">Biểu đồ giá</h2>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${days === d ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      <p className="mb-2 text-xs text-slate-500">
        Xu hướng: <span className="font-medium text-slate-700">{trendLabel}</span>
        <span className="mx-1.5">·</span>
        Giá TB: <span className="font-medium text-slate-700">{formatPrice(Math.round(avg))}</span>
      </p>

      <div className="w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
          {/* grid */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{fmtCompact(t)}</text>
            </g>
          ))}
          {/* line */}
          <path d={path} fill="none" stroke="#0284c7" strokeWidth="2" />
          {/* dot end */}
          <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].price)} r="3.5" fill="#0284c7" />
          {/* x labels */}
          {data.map((d, i) => (i % labelStride === 0 ? (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.date}</text>
          ) : null))}
        </svg>
      </div>
    </section>
  );
}

// ─── Breadcrumb (san-pham detail) ───────────────────────────────────
function Breadcrumb({ crumbs, go }) {
  return (
    <nav className="flex items-center gap-1 text-xs text-slate-500">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight />}
          {c.href ? (
            <button onClick={() => go(c.href)} className="hover:text-primary-600">{c.label}</button>
          ) : (
            <span className="text-slate-700">{c.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ─── Ad zone placeholder (matches AdZone style) ─────────────────────
function AdZone({ position, label }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-2">
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center text-xs text-slate-400">
        {label || `Khu vực quảng cáo · ${position}`}
      </div>
    </div>
  );
}

Object.assign(window, { SearchResultCard, SearchFilters, PriceComparisonTable, PriceHistoryChart, Breadcrumb, AdZone });
