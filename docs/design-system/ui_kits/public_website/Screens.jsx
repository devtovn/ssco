/* global React */
const { useState, useMemo } = React;

// ─── Mock data ──────────────────────────────────────────────────────
const CATEGORIES = [
  { slug: "dien-lanh", name: "Điện lạnh", icon: "❄️", count: 248 },
  { slug: "thiet-bi-gia-dung", name: "Thiết bị gia dụng", icon: "🏠", count: 412 },
  { slug: "dien-thoai", name: "Điện thoại", icon: "📱", count: 1083 },
  { slug: "may-tinh-bang", name: "Máy tính bảng", icon: "🛒", count: 156 },
  { slug: "laptop", name: "Laptop", icon: "💻", count: 689 },
  { slug: "co-khi", name: "Cơ khí", icon: "🛒", count: 92 },
  { slug: "thiet-bi-van-phong", name: "Thiết bị văn phòng", icon: "🛒", count: 134 },
  { slug: "am-thanh-hinh-anh", name: "Âm thanh & Hình ảnh", icon: "🎧", count: 367 },
  { slug: "phu-kien-dien-tu", name: "Phụ kiện điện tử", icon: "🛒", count: 821 },
  { slug: "do-gia-dung-nha-bep", name: "Đồ gia dụng nhà bếp", icon: "🛒", count: 295 },
];

const POPULAR = ["iPhone 15", "tủ lạnh", "laptop gaming", "tai nghe bluetooth", "máy lạnh inverter", "Samsung Galaxy S24"];

const DEALS = [
  { productId: "p-iphone15", productName: "iPhone 15 Pro Max 256GB chính hãng VN/A", currentPrice: 28490000, originalPrice: 37990000, discountPercentage: 25, source: "tiki.vn" },
  { productId: "p-fridge", productName: "Tủ lạnh Samsung Inverter 380L RT38", currentPrice: 9890000, originalPrice: 16490000, discountPercentage: 40, source: "lazada.vn" },
  { productId: "p-laptop", productName: "Laptop Asus Vivobook 15 X1504 Core i5", currentPrice: 13990000, originalPrice: 18290000, discountPercentage: 24, source: "shopee.vn" },
  { productId: "p-headphones", productName: "Tai nghe Sony WH-1000XM5 chính hãng", currentPrice: 6790000, originalPrice: 9490000, discountPercentage: 28, source: "tiki.vn" },
];

const SEARCH_RESULTS = [
  { id: "p-iphone15", name: "iPhone 15 Pro Max 256GB chính hãng VN/A", brand: "Apple", categoryName: "Điện thoại", lowestPrice: 28490000 },
  { id: "p-iphone15p", name: "iPhone 15 Plus 128GB chính hãng VN/A", brand: "Apple", categoryName: "Điện thoại", lowestPrice: 21990000 },
  { id: "p-iphone14", name: "iPhone 14 Pro Max 128GB cũ likenew 99%", brand: "Apple", categoryName: "Điện thoại", lowestPrice: 18490000 },
  { id: "p-galaxys24", name: "Samsung Galaxy S24 Ultra 12/256GB", brand: "Samsung", categoryName: "Điện thoại", lowestPrice: 24990000 },
  { id: "p-pixel8", name: "Google Pixel 8 Pro 128GB nguyên seal", brand: "Google", categoryName: "Điện thoại", lowestPrice: 17890000 },
  { id: "p-iphone-airpods", name: "Apple AirPods Pro 2 USB-C bản 2024", brand: "Apple", categoryName: "Phụ kiện điện tử", lowestPrice: 5490000 },
];

const PRODUCT = {
  "p-iphone15": {
    name: "iPhone 15 Pro Max 256GB chính hãng VN/A",
    brand: "Apple",
    categorySlug: "dien-thoai",
    categoryName: "Điện thoại",
    description: "iPhone 15 Pro Max thiết kế khung viền titan, camera 48MP, chip A17 Pro 6 nhân. Bảo hành 12 tháng chính hãng Apple Việt Nam.",
    listings: [
      { id: "l1", source: "tiki", price: 28490000, isAvailable: true },
      { id: "l2", source: "lazada", price: 28990000, isAvailable: true },
      { id: "l3", source: "shopee", price: 29290000, isAvailable: false },
      { id: "l4", source: "tiktok", price: 28590000, isAvailable: true },
    ],
    specs: [
      { group: "Màn hình", rows: [
        { k: "Công nghệ", v: "Super Retina XDR OLED, ProMotion 120Hz" },
        { k: "Kích thước", v: "6.7 inch" },
        { k: "Độ phân giải", v: "2796 × 1290 px (460 ppi)" },
        { k: "Độ sáng tối đa", v: "2000 nits (HDR), 1000 nits (ngoài trời)" },
      ]},
      { group: "Hiệu năng", rows: [
        { k: "Chip", v: "Apple A17 Pro (6 nhân CPU, 6 nhân GPU)" },
        { k: "RAM", v: "8 GB" },
        { k: "Bộ nhớ trong", v: "256 GB" },
        { k: "Hệ điều hành", v: "iOS 17, nâng cấp được lên iOS 18" },
      ]},
      { group: "Camera", rows: [
        { k: "Camera sau", v: "48 MP (chính) + 12 MP (siêu rộng) + 12 MP (tele 5x)" },
        { k: "Camera trước", v: "12 MP TrueDepth, ƒ/1.9" },
        { k: "Quay video", v: "4K@60fps, ProRes 4K@60fps, Dolby Vision HDR" },
      ]},
      { group: "Pin & sạc", rows: [
        { k: "Dung lượng pin", v: "4422 mAh" },
        { k: "Sạc nhanh", v: "20W có dây, MagSafe 15W không dây" },
        { k: "Cổng kết nối", v: "USB-C (USB 3, lên đến 10 Gb/s)" },
      ]},
      { group: "Kết nối & khác", rows: [
        { k: "SIM", v: "1 Nano-SIM + eSIM" },
        { k: "Kết nối không dây", v: "Wi-Fi 6E, Bluetooth 5.3, NFC, 5G" },
        { k: "Kích thước", v: "159.9 × 76.7 × 8.25 mm" },
        { k: "Trọng lượng", v: "221 g" },
        { k: "Kháng nước", v: "IP68 (6m / 30 phút)" },
      ]},
    ],
    specSources: [
      { name: "Apple Việt Nam", url: "https://www.apple.com/vn/shop/buy-iphone/iphone-15-pro", domain: "apple.com/vn", note: "Trang sản phẩm chính hãng", primary: true, fetchedAt: "2026-05-23T08:12:00Z" },
      { name: "Tiki", url: "https://tiki.vn/iphone-15-pro-max", domain: "tiki.vn", note: "Mô tả + thông số nhà bán hàng", fetchedAt: "2026-05-23T07:45:00Z" },
      { name: "Lazada", url: "https://www.lazada.vn/iphone-15-pro-max", domain: "lazada.vn", note: "Bảng spec trang sản phẩm", fetchedAt: "2026-05-23T07:38:00Z" },
      { name: "GSMArena", url: "https://www.gsmarena.com/apple_iphone_15_pro_max", domain: "gsmarena.com", note: "Đối chiếu thông số kỹ thuật", fetchedAt: "2026-05-22T22:10:00Z" },
    ],
    relatedKeywords: [
      "iPhone 15 Pro Max 256GB", "iPhone 15 Pro Max giá rẻ", "iPhone 15 Pro Max chính hãng",
      "so sánh iPhone 15 Pro Max vs S24 Ultra", "iPhone 15 Pro Max Tiki", "case iPhone 15 Pro Max",
      "sạc MagSafe 15W", "iPhone 15 Pro Max trả góp",
    ],
    relatedNews: [
      { id: "n1", title: "Apple giảm giá iPhone 15 Pro Max tại Việt Nam dịp cuối tháng 5", source: "VnExpress", publishedAt: "2026-05-22", url: "#" },
      { id: "n2", title: "So sánh camera iPhone 15 Pro Max vs Galaxy S24 Ultra sau 6 tháng sử dụng", source: "Tinhte.vn", publishedAt: "2026-05-20", url: "#" },
      { id: "n3", title: "Tiki mở Flash Sale iPhone 15 series giảm đến 4 triệu đồng", source: "CafeF", publishedAt: "2026-05-19", url: "#" },
    ],
  },
};

// ─── Home screen ────────────────────────────────────────────────────
function HomeScreen({ go }) {
  return (
    <>
      <section className="bg-gradient-to-b from-primary-50 to-white">
        <AdZone position="header" />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-12">
          <div className="text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              So sánh giá từ Tiki, Lazada, Shopee
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Tìm giá tốt nhất trước khi mua — không cần đăng nhập
            </p>
          </div>
          <div className="mt-10">
            <SearchBar go={go} />
            <PopularKeywords keywords={POPULAR} go={go} />
          </div>
          <CategoryGrid categories={CATEGORIES} go={go} />
          <VoucherTabs featured className="mt-16" />
          <DealsSection deals={DEALS} go={go} />
          <SuggestedToday go={go} />
        </div>
      </section>
    </>
  );
}

// ─── Search results screen ──────────────────────────────────────────
function SearchScreen({ q, go }) {
  const [filters, setFilters] = useState({ sortBy: "relevance", category: "", brand: "", minPrice: "", maxPrice: "" });
  const filtered = useMemo(() => {
    let r = SEARCH_RESULTS;
    if (q) {
      const ql = q.toLowerCase();
      r = r.filter(p => p.name.toLowerCase().includes(ql) || (p.brand || "").toLowerCase().includes(ql));
    }
    if (filters.brand) r = r.filter(p => p.brand === filters.brand);
    if (filters.minPrice) r = r.filter(p => p.lowestPrice >= +filters.minPrice);
    if (filters.maxPrice) r = r.filter(p => p.lowestPrice <= +filters.maxPrice);
    if (filters.sortBy === "price_asc") r = [...r].sort((a, b) => a.lowestPrice - b.lowestPrice);
    if (filters.sortBy === "price_desc") r = [...r].sort((a, b) => b.lowestPrice - a.lowestPrice);
    return r;
  }, [q, filters]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">
        {q ? `Kết quả cho "${q}"` : "Tìm kiếm sản phẩm"}
      </h1>
      <div className="mt-6 max-w-2xl">
        <SearchBar go={go} initial={q || ""} />
      </div>
      {!q ? (
        <p className="mt-8 text-slate-600">Nhập từ khóa để bắt đầu tìm kiếm sản phẩm.</p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          <SearchFilters
            filters={filters}
            setFilters={setFilters}
            brands={[{ name: "Apple", count: 4 }, { name: "Samsung", count: 1 }, { name: "Google", count: 1 }]}
            categories={[{ slug: "dien-thoai", name: "Điện thoại", count: 5 }, { slug: "phu-kien-dien-tu", name: "Phụ kiện điện tử", count: 1 }]}
            priceRange={{ min: 5490000, max: 28490000 }}
          />
          <div>
            <p className="text-sm text-slate-500">{filtered.length} kết quả · 124ms</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(p => (
                <SearchResultCard key={p.id} p={p} onClick={() => go(`/san-pham/${p.id}`)} />
              ))}
            </div>
            {!filtered.length && (
              <p className="mt-8 text-center text-slate-600">Không tìm thấy sản phẩm phù hợp.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product detail screen ──────────────────────────────────────────
function ProductScreen({ id, go }) {
  const p = PRODUCT[id] || PRODUCT["p-iphone15"];
  const lowest = useMemo(() => {
    const avail = p.listings.filter(l => l.isAvailable);
    return avail.reduce((m, c) => (c.price < m.price ? c : m), avail[0]);
  }, [p]);
  const [days, setDays] = useState(30);

  // Build a deterministic synthetic history
  const history = useMemo(() => {
    const out = [];
    const base = lowest?.price || 28490000;
    for (let i = days - 1; i >= 0; i--) {
      const noise = Math.sin(i / 3) * 0.04 + Math.cos(i / 7) * 0.02;
      const drift = (i / days) * 0.05; // up over time
      const price = Math.round(base * (1 + drift + noise));
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({ date: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }), price });
    }
    return out;
  }, [days, lowest]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Trang chủ", href: "/" },
        { label: "Điện thoại", href: `/danh-muc/${p.categorySlug}` },
        { label: p.name },
      ]} go={go} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-100">
            <PackageEmoji size={80} />
          </div>
          <div className="mt-4 flex gap-2">
            {[0,1,2,3].map(i => (
              <div key={i} className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                <PackageEmoji size={22} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">{p.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{p.categoryName} · {p.brand}</p>
          <p className="mt-3 text-3xl font-bold text-primary-700">{formatPrice(lowest?.price)}</p>
          <p className="text-sm text-green-600 mt-1">Giá thấp nhất trên {lowest?.source}</p>
          <p className="mt-6 leading-relaxed text-slate-700">{p.description}</p>

          {/* Vouchers for the cheapest source */}
          <div className="mt-6">
            <VoucherTable source={lowest?.source || "tiki"} />
          </div>

          {/* Related keywords */}
          <div className="mt-5">
            <RelatedKeywords keywords={p.relatedKeywords || []} go={go} />
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-xl font-bold text-slate-900 sr-only">Chi tiết sản phẩm</h2>
      {/* Tabs + optional news sidebar */}
      <div className={`mt-10 ${(p.relatedNews || []).length > 0 ? "grid gap-6 lg:grid-cols-12" : ""}`}>
        <div className={(p.relatedNews || []).length > 0 ? "lg:col-span-9" : ""}>
          <ProductDetailTabs product={p} productId={id} lowest={lowest} onGo={go} history={history} days={days} setDays={setDays} />
        </div>
        {(p.relatedNews || []).length > 0 && (
          <aside className="lg:col-span-3">
            <RelatedNews news={p.relatedNews} />
          </aside>
        )}
      </div>

      <AdZone position="in-content" label="Khu vực quảng cáo · in-content" />

      <RelatedProducts current={id} count={4} go={go} />
      <YouMightAlsoLike current={id} go={go} />
    </div>
  );
}

// ─── Related products — 4-col grid ─────────────────────────────────
const PAGE_SIZE = 4;
function RelatedProducts({ current, go }) {
  const all = SEARCH_RESULTS.filter(p => p.id !== current);
  const [shown, setShown] = useState(PAGE_SIZE);
  const items = all.slice(0, shown);
  const hasMore = shown < all.length;
  if (!all.length) return null;
  return (
    <section className="mt-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sản phẩm liên quan</h2>
          <p className="mt-1 text-sm text-slate-500">Các sản phẩm cùng phân khúc, được so sánh phổ biến nhất</p>
        </div>
        <button onClick={() => go("/search?q=iPhone")} className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 md:inline-block">
          Xem thêm →
        </button>
      </div>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {items.map(p => (
          <button
            key={p.id}
            onClick={() => go(`/san-pham/${p.id}`)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-primary-300 hover:shadow-md"
          >
            <div className="flex aspect-square w-full items-center justify-center bg-slate-100">
              <PackageEmoji size={38} />
            </div>
            <div className="flex flex-1 flex-col p-3">
              <p className="text-xs text-slate-400">{p.categoryName}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 min-h-[2.5rem] group-hover:text-primary-700">{p.name}</h3>
              {p.brand && <p className="mt-1 text-xs text-slate-400">{p.brand}</p>}
              <p className="mt-auto pt-2 text-base font-bold text-primary-600">{formatPrice(p.lowestPrice)}</p>
            </div>
          </button>
        ))}
      </div>
      {hasMore && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => setShown(s => Math.min(s + PAGE_SIZE, all.length))}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-400 hover:text-primary-700"
          >
            Xem thêm ({Math.min(PAGE_SIZE, all.length - shown)} sản phẩm) →
          </button>
        </div>
      )}
    </section>
  );
}

// ─── "Có thể bạn cũng thích" — cross-category grid ─────────────────
// Broader picks from other categories (distinct from same-category related list)
const ALSO_LIKE_POOL = [
  { id: "al1", name: "Tai nghe Sony WH-1000XM5 chống ồn chủ động", brand: "Sony", categoryName: "Âm thanh & Hình ảnh", lowestPrice: 6790000, badge: "Bán chạy" },
  { id: "al2", name: "Apple Watch Series 9 GPS 41mm nhôm dây cao su", brand: "Apple", categoryName: "Phụ kiện điện tử", lowestPrice: 9490000, badge: null },
  { id: "al3", name: "Sạc MagSafe 15W chính hãng Apple USB-C", brand: "Apple", categoryName: "Phụ kiện điện tử", lowestPrice: 890000, badge: "Thường mua cùng" },
  { id: "al4", name: "Case iPhone 15 Pro Max Spigen Ultra Hybrid", brand: "Spigen", categoryName: "Phụ kiện điện tử", lowestPrice: 390000, badge: "Thường mua cùng" },
  { id: "al5", name: "Laptop Apple MacBook Air M3 13 inch 8GB/256GB", brand: "Apple", categoryName: "Laptop", lowestPrice: 27990000, badge: null },
  { id: "al6", name: "iPad Pro M4 11 inch WiFi 256GB", brand: "Apple", categoryName: "Máy tính bảng", lowestPrice: 23490000, badge: "Mới" },
  { id: "al7", name: "Bàn phím Magic Keyboard với Touch ID — tiếng Việt", brand: "Apple", categoryName: "Phụ kiện điện tử", lowestPrice: 2790000, badge: null },
  { id: "al8", name: "Chuột Apple Magic Mouse sạc USB-C", brand: "Apple", categoryName: "Phụ kiện điện tử", lowestPrice: 1990000, badge: null },
];

const BADGE_STYLE = {
  "Bán chạy":         "bg-red-100 text-red-700",
  "Thường mua cùng":  "bg-amber-100 text-amber-800",
  "Mới":              "bg-primary-100 text-primary-800",
};

function YouMightAlsoLike({ current, go }) {
  const PAGE = 4;
  const all = ALSO_LIKE_POOL.filter(p => p.id !== current);
  const [shown, setShown] = useState(PAGE);
  const items = all.slice(0, shown);
  const hasMore = shown < all.length;
  if (!all.length) return null;

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Có thể bạn cũng thích</h2>
          <p className="mt-1 text-sm text-slate-500">Gợi ý từ các danh mục phổ biến khác</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        {items.map(p => (
          <button
            key={p.id}
            onClick={() => go(`/search?q=${encodeURIComponent(p.name)}`)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-primary-300 hover:shadow-md"
          >
            {/* Image well */}
            <div className="relative flex aspect-square w-full items-center justify-center bg-slate-100">
              <PackageEmoji size={38} />
              {p.badge && (
                <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold ${BADGE_STYLE[p.badge] || "bg-slate-100 text-slate-700"}`}>
                  {p.badge}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col p-3">
              <p className="text-xs text-slate-400">{p.categoryName}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 min-h-[2.5rem] group-hover:text-primary-700">
                {p.name}
              </h3>
              {p.brand && <p className="mt-1 text-xs text-slate-400">{p.brand}</p>}
              <p className="mt-auto pt-2 text-base font-bold text-primary-600">
                {formatPrice(p.lowestPrice)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShown(s => Math.min(s + PAGE, all.length))}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary-400 hover:text-primary-700"
          >
            Xem thêm ({Math.min(PAGE, all.length - shown)} sản phẩm) →
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Product detail tabs ────────────────────────────────────────────
function ProductDetailTabs({ product, productId, lowest, onGo, history, days, setDays }) {
  const [tab, setTab] = useState("price");
  const tabs = [
    { id: "price", label: "So sánh giá", count: product.listings.length },
    { id: "specs", label: "Thông số kỹ thuật" },
  ];
  return (
    <>
      <div role="tablist" className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`relative -mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500"}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "price" && (
        <div className="mt-6 space-y-8">
          <PriceComparisonTable rows={product.listings} lowestId={lowest?.id} productId={productId} onGo={onGo} />
          <PriceHistoryChart data={history} days={days} setDays={setDays} trend="increasing" />
        </div>
      )}

      {tab === "specs" && (
        <>
          <SpecsTable groups={product.specs || []} />
          <SpecSources sources={product.specSources || []} />
        </>
      )}
    </>
  );
}

// ─── Spec sources / references ──────────────────────────────────────
function SpecSources({ sources }) {
  if (!sources.length) return null;
  const fmt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Nguồn tham khảo thông số</h3>
          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu kỹ thuật được tổng hợp và đối chiếu từ {sources.length} nguồn dưới đây.
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 md:inline-block">
          Đã kiểm chứng chéo
        </span>
      </div>

      <ul className="mt-4 divide-y divide-slate-100">
        {sources.map((s) => (
          <li key={s.url} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold uppercase text-slate-500">
              {s.domain.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-sm font-semibold text-slate-900 hover:text-primary-700"
                >
                  {s.name}
                </a>
                {s.primary && (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    Nguồn chính
                  </span>
                )}
                <span className="text-xs text-slate-400">· {s.domain}</span>
              </div>
              {s.note && <p className="mt-0.5 text-xs text-slate-500">{s.note}</p>}
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              <span>Cập nhật {fmt(s.fetchedAt)}</span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 hover:border-primary-300 hover:text-primary-700"
              >
                Xem
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M7 17 17 7"/><path d="M8 7h9v9"/>
                </svg>
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
        SSCO không bán hàng trực tiếp. Thông số có thể thay đổi tùy phiên bản; vui lòng đối chiếu với trang nhà sản xuất trước khi mua.
      </p>
    </section>
  );
}

// ─── Specs table ────────────────────────────────────────────────────
function SpecsTable({ groups }) {
  if (!groups.length) {
    return (
      <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
        Chưa có thông số kỹ thuật cho sản phẩm này.
      </p>
    );
  }
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <tbody>
          {groups.map((g, gi) => (
            <React.Fragment key={g.group}>
              <tr>
                <th
                  colSpan={2}
                  className={`bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${gi > 0 ? "border-t border-slate-200" : ""}`}
                >
                  {g.group}
                </th>
              </tr>
              {g.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-slate-100">
                  <td className="w-1/3 px-4 py-3 align-top text-slate-500">{r.k}</td>
                  <td className="px-4 py-3 align-top font-medium text-slate-900">{r.v}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Deals screen ───────────────────────────────────────────────────
function DealsScreen({ go }) {
  const all = [...DEALS, ...DEALS, ...DEALS].map((d, i) => ({ ...d, productId: `${d.productId}-${i}` }));
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Ưu đãi tốt nhất</h1>
      <p className="mt-2 text-slate-600">Sản phẩm đang giảm giá mạnh trên các sàn</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {all.map(d => (
          <button
            key={d.productId}
            onClick={() => go(`/san-pham/${d.productId.split("-").slice(0,2).join("-")}`)}
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
    </div>
  );
}

// ─── Category landing ───────────────────────────────────────────────
const COLS = 3; // lg grid columns
const AD_EVERY = 8; // inject ad zone every N products

function CategoryScreen({ slug, go }) {
  const cat = CATEGORIES.find(c => c.slug === slug) || CATEGORIES[0];
  // Pad mock list to 14 items for demo
  const products = [...SEARCH_RESULTS, ...SEARCH_RESULTS, ...SEARCH_RESULTS].slice(0, 14).map((p, i) => ({ ...p, id: p.id + '-' + i }));

  // Build interleaved list: groups of AD_EVERY products, then an ad
  const rows = [];
  for (let i = 0; i < products.length; i += AD_EVERY) {
    rows.push({ type: 'products', items: products.slice(i, i + AD_EVERY) });
    rows.push({ type: 'ad' });
  }
  // If fewer than AD_EVERY total, move ad to after row 2 (6 items)
  const useSimple = products.length < AD_EVERY;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Breadcrumb crumbs={[{ label: "Trang chủ", href: "/" }, { label: cat.name }]} go={go} />
      <div className="mt-6 flex items-center gap-4">
        <span className="text-5xl">{cat.icon}</span>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{cat.name}</h1>
          <p className="text-sm text-slate-500">{cat.count} sản phẩm · cập nhật mỗi 6 giờ</p>
        </div>
      </div>

      <VoucherTabs className="mt-8" />

      <div className="mt-8">
        {useSimple ? (
          <>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {products.slice(0, 8).map(p => <SearchResultCard key={p.id} p={p} onClick={() => go(`/san-pham/${p.id.split('-')[0]}`)} />)}
            </div>
            <AdZone position="in-content" label="Khu vực quảng cáo · danh mục" />
            <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {products.slice(8).map(p => <SearchResultCard key={p.id} p={p} onClick={() => go(`/san-pham/${p.id.split('-')[0]}`)} />)}
            </div>
          </>
        ) : (
          rows.map((row, i) =>
            row.type === 'ad'
              ? <AdZone key={'ad-' + i} position="in-content" label="Khu vực quảng cáo · danh mục" />
              : <div key={'g-' + i} className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mb-4">
                  {row.items.map(p => <SearchResultCard key={p.id} p={p} onClick={() => go(`/san-pham/${p.id.split('-')[0]}`)} />)}
                </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Affiliate templates (configured by Admin → Affiliate) ─────────
// Format mirrors Requirement 12: {base_url}?spid={product_id}&aff_sid={refer_code}
const AFFILIATE_TEMPLATES = {
  tiki: {
    name: "Tiki",
    domain: "tiki.vn",
    template: "{base_url}?spid={product_id}&aff_sid={refer_code}&utm_campaign={campaign_id}",
    refer_code: "ssco_tk_2026",
    campaign_id: "compare_2026q2",
    enabled: true,
  },
  lazada: {
    name: "Lazada",
    domain: "lazada.vn",
    template: "{base_url}?aff_id={refer_code}&pid={product_id}&cid={campaign_id}",
    refer_code: "ssco_lzd_001",
    campaign_id: "compare_2026q2",
    enabled: true,
  },
  shopee: {
    name: "Shopee",
    domain: "shopee.vn",
    template: "{base_url}?af_siteid=ssco&af_sub_siteid={refer_code}&pid={product_id}&campaign={campaign_id}",
    refer_code: "ssco-shp",
    campaign_id: "compare_2026q2",
    enabled: true,
  },
  tiktok: {
    name: "TikTok Shop",
    domain: "tiktokshop.vn",
    template: "{base_url}?aff_code={refer_code}&item_id={product_id}&c={campaign_id}",
    refer_code: "ssco_ttk",
    campaign_id: "compare_2026q2",
    enabled: true,
  },
};

// Per-listing base URL (mocked — would come from data crawler)
const LISTING_BASE_URLS = {
  l1: "https://tiki.vn/dien-thoai-iphone-15-pro-max-256gb",
  l2: "https://www.lazada.vn/products/dien-thoai-iphone-15-pro-max-256gb",
  l3: "https://shopee.vn/iPhone-15-Pro-Max-256GB",
  l4: "https://shop.tiktok.com/iphone-15-pro-max-256gb",
};
// Per-listing product_id (used by template substitution)
const LISTING_PRODUCT_IDS = {
  l1: "274093321",
  l2: "1820019991",
  l3: "987654.123456",
  l4: "1729842871",
};

function buildAffiliateUrl(listing) {
  const tpl = AFFILIATE_TEMPLATES[listing.source];
  const base = LISTING_BASE_URLS[listing.id] || "https://example.com";
  if (!tpl || !tpl.enabled) return base; // fallback to direct link
  const pid = LISTING_PRODUCT_IDS[listing.id] || "0";
  return tpl.template
    .replace("{base_url}", base)
    .replace("{product_id}", pid)
    .replace("{refer_code}", tpl.refer_code)
    .replace("{campaign_id}", tpl.campaign_id || "default");
}

// ─── Affiliate redirect interstitial ────────────────────────────────
// Route: /di-toi-noi-ban?listing=<id>&product=<pid>
function RedirectScreen({ listingId, productId, go }) {
  const product = PRODUCT[productId] || PRODUCT["p-iphone15"];
  const listing = product.listings.find(l => l.id === listingId) || product.listings[0];
  const template = AFFILIATE_TEMPLATES[listing.source];
  const finalUrl = buildAffiliateUrl(listing);

  // Countdown duration is configured by Admin → Hiển thị (3–7s)
  const COUNTDOWN_SECONDS = (() => {
    try {
      const v = parseInt(localStorage.getItem("ssco_redirect_countdown") || "5", 10);
      return Math.min(7, Math.max(3, isNaN(v) ? 5 : v));
    } catch { return 5; }
  })();
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [paused, setPaused] = useState(false);

  React.useEffect(() => {
    if (paused) return;
    if (seconds <= 0) {
      window.open(finalUrl, "_blank", "noopener,noreferrer");
      go(`/san-pham/${productId}`);
      return;
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, paused]);

  function goNow() {
    setPaused(true);
    window.open(finalUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => go(`/san-pham/${productId}`), 200);
  }

  const ring = (COUNTDOWN_SECONDS - seconds) / COUNTDOWN_SECONDS;
  const circumference = 2 * Math.PI * 28;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <button onClick={() => go(`/san-pham/${productId}`)} className="text-sm text-slate-500 hover:text-primary-700">
          ← Quay lại sản phẩm
        </button>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 text-lg font-bold uppercase">
              {(template?.domain || listing.source).slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chuẩn bị chuyển trang</p>
              <h1 className="mt-1 text-xl font-bold text-slate-900">
                Bạn đang rời SSCO sang <span className="text-primary-700">{template?.name || listing.source}</span>
              </h1>
              <p className="mt-1 text-sm text-slate-600 line-clamp-2">{product.name}</p>
            </div>
          </div>

          {/* Product image */}
          <div className="mt-5 flex items-center justify-center">
            <div className="flex aspect-square w-40 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100">
              <PackageEmoji size={56} />
            </div>
          </div>

          {/* Countdown ring */}
          <div className="mt-6 flex items-center justify-center">
            <div className="relative">
              <svg width="80" height="80" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke="#0284c7" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - ring)}
                  transform="rotate(-90 32 32)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{seconds}</span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-slate-600">
            Tự động chuyển sau <b>{seconds}</b> giây… hoặc chọn bên dưới.
          </p>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => go(`/san-pham/${productId}`)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:w-auto sm:flex-1"
            >
              Quay về SSCO
            </button>
            <button
              onClick={goNow}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 sm:w-auto sm:flex-1"
            >
              Đi ngay tới {template?.name || listing.source} →
            </button>
          </div>

          <p className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            SSCO có thể nhận hoa hồng nếu bạn đặt mua sau khi click. Giá bạn trả không thay đổi.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Voucher data ───────────────────────────────────────────────────
const VOUCHERS = {
  tiki: [
    { code: "TIKIBACK10", desc: "Hoàn 10% tối đa 100k cho đơn từ 500k", expires: "31/05/2026", type: "cashback" },
    { code: "FREESHIP99", desc: "Miễn phí vận chuyển toàn quốc", expires: "30/05/2026", type: "shipping" },
    { code: "DEAL15OFF", desc: "Giảm 15% tối đa 200k cho Điện thoại", expires: "25/05/2026", type: "discount" },
  ],
  lazada: [
    { code: "LAZSAVE50K", desc: "Giảm 50k cho đơn từ 500k", expires: "28/05/2026", type: "discount" },
    { code: "LAZFS0", desc: "Freeship không giới hạn", expires: "31/05/2026", type: "shipping" },
  ],
  shopee: [
    { code: "SPBACK15", desc: "Hoàn xu 15% tối đa 150k", expires: "29/05/2026", type: "cashback" },
    { code: "SPSAVE200", desc: "Giảm 200k cho đơn từ 1 triệu", expires: "26/05/2026", type: "discount" },
  ],
  tiktok: [
    { code: "TTKNEW30", desc: "Giảm 30% cho lần đầu mua trên TikTok Shop", expires: "31/05/2026", type: "discount" },
  ],
  sendo: [
    { code: "SENDO20", desc: "Giảm 20k cho đơn từ 200k", expires: "30/05/2026", type: "discount" },
    { code: "SENDOFS", desc: "Freeship đơn từ 150k", expires: "28/05/2026", type: "shipping" },
  ],
};

const VOUCHER_COLORS = {
  cashback: { badge: "bg-amber-100 text-amber-800", label: "Hoàn tiền" },
  shipping: { badge: "bg-green-100 text-green-800", label: "Freeship" },
  discount: { badge: "bg-primary-100 text-primary-800", label: "Giảm giá" },
};

// Platform homepage for voucher affiliate links (no product_id needed)
const PLATFORM_HOME_URLS = {
  tiki:   "https://tiki.vn",
  lazada: "https://lazada.vn",
  shopee: "https://shopee.vn",
  tiktok: "https://shop.tiktok.com",
  sendo:  "https://sendo.vn",
};

function buildPlatformAffUrl(platformKey) {
  const tpl = AFFILIATE_TEMPLATES[platformKey];
  const base = PLATFORM_HOME_URLS[platformKey] || "#";
  if (!tpl || !tpl.enabled) return base;
  return tpl.template
    .replace("{base_url}", base)
    .replace("{product_id}", "")
    .replace("{refer_code}", tpl.refer_code)
    .replace("{campaign_id}", tpl.campaign_id || "default")
    .replace(/[?&][^=]+=(&|$)/g, '') // remove empty params
    .replace(/&&/g, '&').replace(/\?&/, '?');
}

// ─── VoucherTabs (reusable — Home + Category) ───────────────────────
const VOUCHER_TAB_ORDER = [
  { key: "tiki",   label: "Tiki" },
  { key: "shopee", label: "Shopee" },
  { key: "tiktok", label: "TikTok Shop" },
  { key: "lazada", label: "Lazada" },
];

function VoucherTabs({ className = "", featured = false }) {
  const [active, setActive] = useState("tiki");
  const [copied, setCopied] = useState(null);
  const vouchers = VOUCHERS[active] || [];
  const tpl = AFFILIATE_TEMPLATES[active];

  function copy(code) {
    try { navigator.clipboard.writeText(code); } catch {}
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className={`${className}`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {featured ? (
            <>
              <h2 className="text-2xl font-bold text-slate-900">🏷️ Mã giảm giá hôm nay</h2>
              <p className="mt-1 text-sm text-slate-500">Voucher từ các sàn TMĐT lớn — cập nhật hàng ngày, dùng ngay khi mua</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">Mã giảm giá</h2>
              <p className="mt-1 text-sm text-slate-500">Voucher từ các sàn thương mại điện tử</p>
            </>
          )}
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${featured ? "border-primary-200 shadow-md ring-1 ring-primary-100" : "border-slate-200"}`}>
        {featured && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-3">
            <p className="text-sm font-semibold text-white">Sao chép mã → Dán khi thanh toán để được giảm giá ngay!</p>
          </div>
        )}

        {/* Platform tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto [scrollbar-width:none]">
          {VOUCHER_TAB_ORDER.map(({ key, label }) => {
            const isActive = active === key;
            const count = (VOUCHERS[key] || []).length;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-5 py-3.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${isActive ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Voucher rows */}
        <div className="divide-y divide-slate-100">
          {vouchers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Chưa có mã giảm giá cho sàn này.</p>
          ) : vouchers.map(v => {
            const c = VOUCHER_COLORS[v.type];
            const isCopied = copied === v.code;
            return (
              <div key={v.code} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">{v.desc}</p>
                  <p className="mt-0.5 text-xs text-slate-400">HSD: {v.expires}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <code className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-bold tracking-widest text-slate-800">
                    {v.code}
                  </code>
                  <button
                    onClick={() => copy(v.code)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isCopied ? "bg-green-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-primary-600 hover:text-white"}`}
                  >
                    {isCopied ? "✓ Đã sao" : "Sao chép"}
                  </button>
                  <a
                    href={buildPlatformAffUrl(active)}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
                  >
                    Dùng mã →
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {tpl && (
          <p className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-400">
            Mã được cung cấp bởi {tpl.name}. Nhấn "Dùng mã" để được chuyển tới {tpl.domain} qua đường dẫn affiliate. SSCO không đảm bảo tính khả dụng của voucher.
          </p>
        )}
      </div>
    </section>
  );
}

// ─── Suggested Today ────────────────────────────────────────────────
const SUGGESTED_TODAY = [
  { id: "st1", name: "Samsung Galaxy S24 Ultra 12/256GB Titanium Black", brand: "Samsung", categoryName: "Điện thoại", lowestPrice: 24990000, badge: "Gợi ý hôm nay" },
  { id: "st2", name: "Máy lạnh Panasonic Inverter 1.5HP CU/CS-XPU12XKH-8", brand: "Panasonic", categoryName: "Điện lạnh", lowestPrice: 8490000, badge: null },
  { id: "st3", name: "Laptop Dell Inspiron 15 3520 Core i5 16GB/512GB", brand: "Dell", categoryName: "Laptop", lowestPrice: 14990000, badge: "Giảm giá" },
  { id: "st4", name: "Robot hút bụi Xiaomi S10+ tự đổ rác", brand: "Xiaomi", categoryName: "Thiết bị gia dụng", lowestPrice: 5990000, badge: "Mới" },
  { id: "st5", name: "Nồi chiên không dầu Philips HD9270 6.2L", brand: "Philips", categoryName: "Đồ gia dụng nhà bếp", lowestPrice: 2490000, badge: null },
  { id: "st6", name: "Tivi Samsung QLED 4K 55 inch QA55Q80D", brand: "Samsung", categoryName: "Âm thanh & Hình ảnh", lowestPrice: 17990000, badge: "Bán chạy" },
  { id: "st7", name: "Tai nghe JBL Tune 770NC chống ồn không dây", brand: "JBL", categoryName: "Âm thanh & Hình ảnh", lowestPrice: 1890000, badge: null },
  { id: "st8", name: "Bàn phím cơ Keychron K2 Pro QMK RGB Hot-swap", brand: "Keychron", categoryName: "Phụ kiện điện tử", lowestPrice: 2190000, badge: null },
];

const TODAY_BADGE_STYLE = {
  "Gợi ý hôm nay": "bg-primary-100 text-primary-800",
  "Giảm giá":      "bg-red-100 text-red-700",
  "Mới":           "bg-teal-100 text-teal-800",
  "Bán chạy":      "bg-amber-100 text-amber-800",
};

function SuggestedToday({ go }) {
  return (
    <section className="mt-16">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sản phẩm gợi ý hôm nay</h2>
          <p className="mt-1 text-sm text-slate-500">Được cập nhật mỗi ngày dựa trên xu hướng tìm kiếm</p>
        </div>
      </div>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {SUGGESTED_TODAY.map(p => (
          <button
            key={p.id}
            onClick={() => go(`/search?q=${encodeURIComponent(p.name)}`)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-primary-300 hover:shadow-md"
          >
            <div className="relative flex aspect-square w-full items-center justify-center bg-slate-100">
              <PackageEmoji size={38} />
              {p.badge && (
                <span className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-semibold ${TODAY_BADGE_STYLE[p.badge] || "bg-slate-100 text-slate-700"}`}>
                  {p.badge}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-3">
              <p className="text-xs text-slate-400">{p.categoryName}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 min-h-[2.5rem] group-hover:text-primary-700">{p.name}</h3>
              {p.brand && <p className="mt-1 text-xs text-slate-400">{p.brand}</p>}
              <p className="mt-auto pt-2 text-base font-bold text-primary-600">{formatPrice(p.lowestPrice)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { VoucherTabs, SuggestedToday });

// ─── Voucher table (compact, for product right column) ───────────────
function VoucherTable({ source }) {
  const vouchers = VOUCHERS[source] || VOUCHERS["tiki"];
  const [copied, setCopied] = useState(null);

  function copy(code) {
    try { navigator.clipboard.writeText(code); } catch {}
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-bold text-slate-900">Mã giảm giá</h3>
        <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">{source}</span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {vouchers.map((v, i) => {
            const c = VOUCHER_COLORS[v.type];
            const isCopied = copied === v.code;
            return (
              <tr key={v.code} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <td className="px-3 py-2.5 w-px">
                  <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ${c.badge}`}>{c.label}</span>
                </td>
                <td className="px-2 py-2.5 text-slate-700 leading-snug">{v.desc}</td>
                <td className="px-2 py-2.5 text-slate-400 whitespace-nowrap">{v.expires}</td>
                <td className="px-3 py-2.5 w-px">
                  <div className="flex items-center gap-1.5">
                    <code className="rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 font-mono font-bold tracking-wide text-slate-800 whitespace-nowrap">
                      {v.code}
                    </code>
                    <button
                      onClick={() => copy(v.code)}
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold transition ${isCopied ? "bg-green-600 text-white" : "bg-primary-600 text-white hover:bg-primary-700"}`}
                    >
                      {isCopied ? "✓" : "Copy"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100 bg-slate-50">
        Voucher do {source} cung cấp. SSCO không đảm bảo tính khả dụng.
      </p>
    </div>
  );
}

// ─── Related keywords ────────────────────────────────────────────────
function RelatedKeywords({ keywords, go }) {
  if (!keywords?.length) return null;
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900 mb-2">Từ khóa liên quan</h3>
      <div className="flex flex-wrap gap-2">
        {keywords.map(k => (
          <button
            key={k}
            onClick={() => go(`/search?q=${encodeURIComponent(k)}`)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Related news sidebar (3/12, only rendered when news exists) ─────
function RelatedNews({ news }) {
  if (!news?.length) return null;
  return (
    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900">Tin tức liên quan</h3>
      </div>
      <ul className="divide-y divide-slate-100">
        {news.map(n => (
          <li key={n.id}>
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="block px-4 py-3 hover:bg-slate-50 transition"
            >
              <p className="text-sm font-medium text-slate-900 leading-snug line-clamp-3 hover:text-primary-700">{n.title}</p>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-slate-600">{n.source}</span>
                <span>·</span>
                <span>{n.publishedAt}</span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

Object.assign(window, { VoucherTable, RelatedKeywords, RelatedNews });
