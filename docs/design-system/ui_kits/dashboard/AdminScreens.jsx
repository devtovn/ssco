/* global React */
const { useState } = React;

// ─── Mock data ─────────────────────────────────────────────────────
const POPULAR_PRODUCTS = [
  { id: "p1", name: "iPhone 15 Pro Max 256GB", views: 1842 },
  { id: "p2", name: "Tủ lạnh Samsung 380L Inverter", views: 1421 },
  { id: "p3", name: "Laptop Asus Vivobook 15", views: 1098 },
  { id: "p4", name: "Samsung Galaxy S24 Ultra", views: 987 },
  { id: "p5", name: "AirPods Pro 2 USB-C", views: 743 },
];

const SEARCH_TRENDS = [
  { q: "iphone 15", count: 482 },
  { q: "tủ lạnh inverter", count: 391 },
  { q: "laptop gaming", count: 287 },
  { q: "tai nghe bluetooth", count: 264 },
  { q: "máy lạnh 1.5hp", count: 213 },
];

// ─── Admin Overview ────────────────────────────────────────────────
function AdminOverview() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
      <p className="mt-1 text-sm text-slate-600">Thống kê hệ thống 7 ngày gần nhất</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lượt xem trang" value="12.430" />
        <StatCard label="Lượt tìm kiếm" value="3.218" />
        <StatCard label="Phiên truy cập" value="5.671" />
        <StatCard label="Thời gian phản hồi TB (ms)" value="124" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Sản phẩm phổ biến</h2>
          <ul className="mt-4 space-y-2">
            {POPULAR_PRODUCTS.map(p => (
              <li key={p.id} className="flex justify-between text-sm border-b border-slate-100 py-2 last:border-0">
                <span className="text-slate-700">{p.name}</span>
                <span className="font-medium text-primary-600">{p.views.toLocaleString("vi-VN")} lượt xem</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Xu hướng tìm kiếm</h2>
          <ul className="mt-4 space-y-2">
            {SEARCH_TRENDS.map(t => (
              <li key={t.q} className="flex justify-between text-sm border-b border-slate-100 py-2 last:border-0">
                <span className="text-slate-700">{t.q}</span>
                <span className="font-medium text-primary-600">{t.count} lần</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// ─── Admin Categories (inline tree editor) ─────────────────────────
const DEFAULT_TREE = [
  { id: "c1", name: "Điện lạnh", slug: "dien-lanh", icon: "❄️", count: 248, active: true, children: [
    { id: "c1a", name: "Máy lạnh", slug: "may-lanh", icon: "", count: 142, active: true, children: [] },
    { id: "c1b", name: "Tủ đông", slug: "tu-dong", icon: "", count: 38, active: true, children: [] },
  ]},
  { id: "c2", name: "Điện thoại", slug: "dien-thoai", icon: "📱", count: 1083, active: true, children: [
    { id: "c2a", name: "iPhone", slug: "iphone", icon: "", count: 412, active: true, children: [] },
    { id: "c2b", name: "Samsung", slug: "samsung", icon: "", count: 387, active: true, children: [] },
  ]},
  { id: "c3", name: "Laptop", slug: "laptop", icon: "💻", count: 689, active: true, children: [] },
  { id: "c4", name: "Thiết bị gia dụng", slug: "thiet-bi-gia-dung", icon: "🏠", count: 412, active: true, children: [] },
  { id: "c5", name: "Âm thanh & Hình ảnh", slug: "am-thanh-hinh-anh", icon: "🎧", count: 367, active: false, children: [] },
];

function CategoryNode({ node, depth = 0, editingId, setEditingId, draft, setDraft, onSave, onDelete }) {
  const isEditing = editingId === node.id;
  return (
    <li className="mt-1">
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50" style={{ paddingLeft: depth * 16 + 8 }}>
        {isEditing ? (
          <>
            <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} className="w-12 rounded border border-slate-300 px-1 py-0.5 text-center text-sm" placeholder="icon" />
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm" />
            <label className="flex items-center gap-1 text-xs text-slate-700">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Hiện
            </label>
            <button onClick={() => onSave(node.id)} className="text-xs text-primary-600 hover:underline">Lưu</button>
            <button onClick={() => setEditingId(null)} className="text-xs text-slate-600 hover:underline">Hủy</button>
          </>
        ) : (
          <>
            {node.icon && <span>{node.icon}</span>}
            <span className="flex-1 font-medium text-slate-800">{node.name}</span>
            {node.count != null && <span className="text-xs text-slate-500">({node.count} SP)</span>}
            {!node.active && <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">Ẩn</span>}
            <button onClick={() => { setEditingId(node.id); setDraft({ name: node.name, icon: node.icon || "", active: node.active }); }} className="text-xs text-primary-600 hover:underline">Sửa</button>
            <button onClick={() => onDelete(node.id)} className="text-xs text-red-600 hover:underline">Xóa</button>
          </>
        )}
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map(ch => (
            <CategoryNode key={ch.id} node={ch} depth={depth + 1} editingId={editingId} setEditingId={setEditingId} draft={draft} setDraft={setDraft} onSave={onSave} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </li>
  );
}

function AdminCategories() {
  const [tree, setTree] = useState(DEFAULT_TREE);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", icon: "", active: true });
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");

  function walk(nodes, fn) { return nodes.map(n => fn(n, ch => walk(ch, fn))); }

  function saveEdit(id) {
    const upd = (nodes) => nodes.map(n => n.id === id ? { ...n, name: draft.name, icon: draft.icon, active: draft.active } : { ...n, children: upd(n.children) });
    setTree(upd(tree));
    setEditingId(null);
  }
  function deleteNode(id) {
    if (!confirm("Xóa danh mục này?")) return;
    const upd = (nodes) => nodes.filter(n => n.id !== id).map(n => ({ ...n, children: upd(n.children) }));
    setTree(upd(tree));
  }
  function addRoot(e) {
    e.preventDefault();
    if (!newName) return;
    const slug = newName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    setTree([...tree, { id: "n-" + Date.now(), name: newName, slug, icon: newIcon, count: 0, active: true, children: [] }]);
    setNewName(""); setNewIcon("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Danh mục</h1>
      <p className="mt-1 text-sm text-slate-600">Cây danh mục sản phẩm</p>

      <form onSubmit={addRoot} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Thêm danh mục</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <input required placeholder="Tên danh mục" value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Icon (emoji)" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue="">
            <option value="">Danh mục gốc</option>
            {tree.map(t => <option key={t.id}>{t.name}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">Thêm danh mục</button>
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ul>
          {tree.map(n => (
            <CategoryNode key={n.id} node={n} editingId={editingId} setEditingId={setEditingId} draft={draft} setDraft={setDraft} onSave={saveEdit} onDelete={deleteNode} />
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Admin: simple Reviewers placeholder ──────────────────────────
const REVIEWERS = [
  { id: "r1", name: "Nguyễn Văn A", email: "a.nguyen@kombe.vn", articles: 42, lastActive: "23/05/2026" },
  { id: "r2", name: "Trần Thị B", email: "b.tran@kombe.vn", articles: 31, lastActive: "22/05/2026" },
  { id: "r3", name: "Lê Văn C", email: "c.le@kombe.vn", articles: 17, lastActive: "20/05/2026" },
];

function AdminReviewers() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Biên tập viên</h1>
      <p className="mt-1 text-sm text-slate-600">Quản lý tài khoản reviewer</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Bài đã viết</th>
              <th className="px-4 py-3 font-medium">Hoạt động</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {REVIEWERS.map(r => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                <td className="px-4 py-3 text-slate-600">{r.email}</td>
                <td className="px-4 py-3 text-slate-600">{r.articles}</td>
                <td className="px-4 py-3 text-slate-600">{r.lastActive}</td>
                <td className="px-4 py-3 text-right">
                  <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 mr-1">Sửa</button>
                  <button className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Khóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">+ Thêm biên tập viên</button>
    </div>
  );
}

// ─── Admin: Display Config (controls related-products count, etc) ──
function AdminDisplayConfig() {
  const [related, setRelated] = useState(5);
  const [popularCount, setPopularCount] = useState(8);
  const [dealsCount, setDealsCount] = useState(8);
  const [countdown, setCountdown] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem("ssco_redirect_countdown") || "5", 10);
      return Math.min(7, Math.max(3, isNaN(v) ? 5 : v));
    } catch { return 5; }
  });
  const [saved, setSaved] = useState(false);

  function save(e) {
    e.preventDefault();
    try { localStorage.setItem("ssco_redirect_countdown", String(countdown)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Cấu hình hiển thị</h1>
      <p className="mt-1 text-sm text-slate-600">Thiết lập các khu vực hiển thị trên trang công khai</p>

      <form onSubmit={save} className="mt-6 max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Sản phẩm liên quan (trang chi tiết)</legend>
          <p className="mt-1 text-xs text-slate-500">Hiển thị bên dưới khu vực quảng cáo in-content. Khuyến nghị 4–5 sản phẩm.</p>
          <div className="mt-3 flex gap-2">
            {[3, 4, 5, 6, 8].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setRelated(n)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  related === n
                    ? "bg-primary-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-primary-300"
                }`}
              >
                {n} SP
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-t border-slate-100 pt-5">
          <legend className="text-sm font-semibold text-slate-900">Thời gian chuyển trang affiliate</legend>
          <p className="mt-1 text-xs text-slate-500">Số giây user nhìn thấy trang trung gian trước khi tự động chuyển sang trang bán.</p>
          <div className="mt-3 flex gap-2">
            {[3, 4, 5, 6, 7].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setCountdown(n)}
                className={`flex h-12 w-12 items-center justify-center rounded-lg text-sm font-semibold transition ${
                  countdown === n
                    ? "bg-primary-600 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-primary-300"
                }`}
              >
                {n}s
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Từ khóa phổ biến (home)</label>
            <input
              type="number" min="4" max="20" value={popularCount}
              onChange={(e) => setPopularCount(+e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Ưu đãi (home)</label>
            <input
              type="number" min="4" max="20" value={dealsCount}
              onChange={(e) => setDealsCount(+e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Thay đổi áp dụng cho mọi visitor sau khi lưu.</p>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                Đã lưu
              </span>
            )}
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              Lưu cấu hình
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Admin: Affiliate templates ────────────────────────────────────
const INITIAL_AFFILIATES = [
  { id: "tiki", name: "Tiki", domain: "tiki.vn", template: "{base_url}?spid={product_id}&aff_sid={refer_code}&utm_campaign={campaign_id}", refer_code: "ssco_tk_2026", campaign_id: "compare_2026q2", enabled: true, clicks: 4821, conversions: 167 },
  { id: "lazada", name: "Lazada", domain: "lazada.vn", template: "{base_url}?aff_id={refer_code}&pid={product_id}&cid={campaign_id}", refer_code: "ssco_lzd_001", campaign_id: "compare_2026q2", enabled: true, clicks: 3209, conversions: 102 },
  { id: "shopee", name: "Shopee", domain: "shopee.vn", template: "{base_url}?af_siteid=ssco&af_sub_siteid={refer_code}&pid={product_id}&campaign={campaign_id}", refer_code: "ssco-shp", campaign_id: "compare_2026q2", enabled: true, clicks: 2814, conversions: 91 },
  { id: "tiktok", name: "TikTok Shop", domain: "tiktokshop.vn", template: "{base_url}?aff_code={refer_code}&item_id={product_id}&c={campaign_id}", refer_code: "ssco_ttk", campaign_id: "summer_sale_2026", enabled: false, clicks: 412, conversions: 8 },
  { id: "sendo", name: "Sendo", domain: "sendo.vn", template: "{base_url}?utm_source=ssco&ref={refer_code}&utm_campaign={campaign_id}", refer_code: "", campaign_id: "default", enabled: false, clicks: 0, conversions: 0 },
];

const PLACEHOLDER_PALETTE = {
  "{base_url}": "bg-blue-100 text-blue-800",
  "{product_id}": "bg-amber-100 text-amber-800",
  "{refer_code}": "bg-green-100 text-green-800",
  "{campaign_id}": "bg-purple-100 text-purple-800",
};

function HighlightedTemplate({ template }) {
  const parts = template.split(/(\{[^}]+\})/g);
  return (
    <span className="break-all font-mono text-xs">
      {parts.map((p, i) =>
        PLACEHOLDER_PALETTE[p]
          ? <span key={i} className={`inline-block rounded px-1 ${PLACEHOLDER_PALETTE[p]}`}>{p}</span>
          : <span key={i} className="text-slate-700">{p}</span>
      )}
    </span>
  );
}

function AdminAffiliate() {
  const [items, setItems] = useState(INITIAL_AFFILIATES);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ template: "", refer_code: "", campaign_id: "", enabled: true });

  function startEdit(item) {
    setEditingId(item.id);
    setDraft({ template: item.template, refer_code: item.refer_code, campaign_id: item.campaign_id || "", enabled: item.enabled });
  }
  function save(id) {
    setItems(items.map(it => it.id === id ? { ...it, ...draft } : it));
    setEditingId(null);
  }
  function toggle(id) {
    setItems(items.map(it => it.id === id ? { ...it, enabled: !it.enabled } : it));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Cấu hình Affiliate</h1>
      <p className="mt-1 text-sm text-slate-600">
        Mỗi sàn TMĐT có một template URL riêng. Các biến <span className="rounded bg-blue-100 px-1 font-mono text-xs text-blue-800">{"{base_url}"}</span>,
        {" "}<span className="rounded bg-amber-100 px-1 font-mono text-xs text-amber-800">{"{product_id}"}</span>,
        {" "}<span className="rounded bg-green-100 px-1 font-mono text-xs text-green-800">{"{refer_code}"}</span>,
        {" "}<span className="rounded bg-purple-100 px-1 font-mono text-xs text-purple-800">{"{campaign_id}"}</span> sẽ được thay thế khi user click "Tới nơi bán".
      </p>

      <ul className="mt-6 space-y-4">
        {items.map(it => (
          <li key={it.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold uppercase text-slate-600">
                  {it.domain.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{it.name}</h3>
                    <span className="text-xs text-slate-400">· {it.domain}</span>
                    {it.enabled
                      ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Đang bật</span>
                      : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Đang tắt</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {it.clicks.toLocaleString("vi-VN")} click · {it.conversions} đơn hàng (30 ngày)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(it.id)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {it.enabled ? "Tắt" : "Bật"}
                </button>
                <button
                  onClick={() => editingId === it.id ? setEditingId(null) : startEdit(it)}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  {editingId === it.id ? "Đóng" : "Chỉnh sửa"}
                </button>
              </div>
            </div>

            {/* Template preview (read-only mode) */}
            {editingId !== it.id && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">Template</span>
                  <HighlightedTemplate template={it.template} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold uppercase tracking-wider text-slate-500">Refer code</span>
                    <span className="rounded bg-green-100 px-1.5 py-0.5 font-mono font-semibold text-green-800">
                      {it.refer_code || "(chưa có)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold uppercase tracking-wider text-slate-500">Campaign</span>
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 font-mono font-semibold text-purple-800">
                      {it.campaign_id || "default"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Edit form */}
            {editingId === it.id && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Template URL</label>
                  <input
                    value={draft.template}
                    onChange={e => setDraft({ ...draft, template: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Placeholder: <code className="rounded bg-blue-100 px-1 text-blue-800">{"{base_url}"}</code>
                    {" · "}<code className="rounded bg-amber-100 px-1 text-amber-800">{"{product_id}"}</code>
                    {" · "}<code className="rounded bg-green-100 px-1 text-green-800">{"{refer_code}"}</code>
                    {" · "}<code className="rounded bg-purple-100 px-1 text-purple-800">{"{campaign_id}"}</code>
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Refer code</label>
                    <input
                      value={draft.refer_code}
                      onChange={e => setDraft({ ...draft, refer_code: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      placeholder="ssco_2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Campaign ID</label>
                    <input
                      value={draft.campaign_id}
                      onChange={e => setDraft({ ...draft, campaign_id: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      placeholder="compare_2026q2"
                    />
                    <p className="mt-1 text-xs text-slate-500">Dùng để tách doanh thu theo chiến dịch.</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
                  <button onClick={() => save(it.id)} className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700">Lưu</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

Object.assign(window, { AdminOverview, AdminCategories, AdminReviewers, AdminDisplayConfig, AdminAffiliate });
