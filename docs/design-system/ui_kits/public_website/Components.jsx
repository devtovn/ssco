/* global React */
const { useState, useRef, useEffect } = React;

// ─── Inline Heroicons (24/outline) ──────────────────────────────────
function SearchIcon({ className = "h-5 w-5", strokeWidth = 1.75 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function ArrowRight({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  );
}
function ChevronRight({ className = "h-3.5 w-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function PackageEmoji({ size = 36 }) {
  // emoji placeholder — fallback when no product image (matches frontend)
  return <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden>📦</span>;
}

// ─── Vietnamese price formatter ─────────────────────────────────────
function formatPrice(value) {
  if (value == null) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

// ─── Brand mark — magnifying glass with S inside ────────────────────
function BrandMark({ size = 28, onBlue = false }) {
  const stroke = onBlue ? "#ffffff" : "#0284c7";
  const sFill = onBlue ? "#ffffff" : "#0369a1";
  const lensFill = onBlue ? "rgba(255,255,255,0.12)" : "#ffffff";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="26" cy="26" r="18" fill={lensFill} stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="40" y1="40" x2="56" y2="56" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <text x="26" y="34" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="700" fontSize="22" letterSpacing="-0.04em" fill={sFill}>S</text>
    </svg>
  );
}

// ─── Header — sticky bg-white/90 backdrop-blur ──────────────────────
function Header({ go, route }) {
  const Nav = ({ to, children }) => (
    <button
      onClick={() => go(to)}
      className={`hover:text-primary-600 transition ${route === to ? "text-primary-700" : ""}`}
    >
      {children}
    </button>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <button onClick={() => go("/")} className="flex items-center gap-2 text-xl font-bold text-primary-700">
          <BrandMark size={30} />
          <span>SSCO<span className="ml-1 text-sm font-normal text-slate-500">So sánh giá</span></span>
        </button>
        <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
          <Nav to="/search">Tìm kiếm</Nav>
          <Nav to="/deals">Ưu đãi</Nav>
          <Nav to="/bai-viet">Bài viết</Nav>
        </nav>
      </div>
    </header>
  );
}

// ─── SearchBar with suggestion dropdown ─────────────────────────────
const SUGGESTIONS = [
  { type: "product", text: "iPhone 15 Pro Max" },
  { type: "product", text: "iPhone 15 Plus" },
  { type: "category", text: "Điện thoại Samsung" },
  { type: "product", text: "Tủ lạnh Inverter Samsung 380L" },
  { type: "product", text: "Laptop Asus Vivobook 15" },
  { type: "keyword", text: "tai nghe bluetooth" },
];

function SearchBar({ go, initial = "" }) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const matches = q.trim().length >= 2
    ? SUGGESTIONS.filter(s => s.text.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
    : [];

  function submit(text) {
    if (!text.trim()) return;
    setOpen(false);
    go(`/search?q=${encodeURIComponent(text.trim())}`);
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); submit(q); }} className="relative">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => matches.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Tìm sản phẩm: iPhone, laptop, tủ lạnh..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-28 text-base shadow-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500"
          autoComplete="off"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          Tìm kiếm
        </button>
      </form>
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {matches.map((m) => (
            <li key={m.type + m.text}>
              <button
                onMouseDown={() => submit(m.text)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
              >
                <span>{m.text}</span>
                <span className="text-xs uppercase text-slate-400">{m.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Popular keyword chips ──────────────────────────────────────────
function PopularKeywords({ keywords, go }) {
  if (!keywords?.length) return null;
  return (
    <section className="mt-6">
      <p className="mb-3 text-center text-sm font-medium text-slate-600">Từ khóa phổ biến</p>
      <div className="flex flex-wrap justify-center gap-2">
        {keywords.map((k) => (
          <button
            key={k}
            onClick={() => go(`/search?q=${encodeURIComponent(k)}`)}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
          >
            {k}
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Category grid ──────────────────────────────────────────────────
function CategoryGrid({ categories, go }) {
  return (
    <section className="mt-16">
      <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">Danh mục sản phẩm</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => go(`/danh-muc/${c.slug}`)}
            className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-primary-300 hover:shadow-md"
          >
            <span className="text-3xl" aria-hidden>{c.icon}</span>
            <span className="mt-2 text-sm font-semibold text-slate-800">{c.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Deals grid ─────────────────────────────────────────────────────
function ProductImageWell({ deal, size = 36 }) {
  return (
    <div className="relative aspect-square bg-slate-100">
      <div className="flex h-full items-center justify-center">
        <PackageEmoji size={48} />
      </div>
      {deal.discountPercentage && (
        <span className="absolute left-2 top-2 rounded-lg bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
          -{Math.round(deal.discountPercentage)}%
        </span>
      )}
    </div>
  );
}

function DealsSection({ deals, go }) {
  if (!deals?.length) return null;
  return (
    <section className="mt-16">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Ưu đãi tốt nhất</h2>
        <button onClick={() => go("/deals")} className="text-sm font-medium text-primary-600 hover:text-primary-700">
          Xem tất cả →
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {deals.map((d) => (
          <button
            key={d.productId}
            onClick={() => go(`/san-pham/${d.productId}`)}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-md"
          >
            <ProductImageWell deal={d} />
            <div className="p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{d.productName}</h3>
              <p className="mt-2 text-lg font-bold text-primary-600">{formatPrice(d.currentPrice)}</p>
              <p className="text-xs text-slate-400 line-through">{formatPrice(d.originalPrice)}</p>
              <p className="mt-1 text-xs text-slate-500">{d.source}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-center text-xs text-slate-400">
          Khu vực quảng cáo · footer
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} SSCO — So sánh giá Tiki, Lazada, Shopee
      </div>
    </footer>
  );
}

Object.assign(window, {
  Header, SearchBar, PopularKeywords, CategoryGrid, DealsSection, Footer,
  ProductImageWell, PackageEmoji, SearchIcon, ArrowRight, ChevronRight,
  BrandMark, formatPrice,
});
