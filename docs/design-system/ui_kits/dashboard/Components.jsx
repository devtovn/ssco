/* global React */
const { useState } = React;

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

// ─── Sidebar ───────────────────────────────────────────────────────
function Sidebar({ title, items, activeHref, onNav, onLogout }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Bảng điều khiển
        </p>
        <div className="mt-1 flex items-center gap-2">
          <BrandMark size={22} />
          <h1 className="text-lg font-bold text-primary-700">{title}</h1>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active = item.href === activeHref;
          return (
            <button
              key={item.href}
              onClick={() => onNav(item.href)}
              className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                active ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-white hover:text-primary-700"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={onLogout}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

// ─── Login ─────────────────────────────────────────────────────────
const ACCOUNTS = [
  { email: "admin", password: "Admin@123456", role: "Administrator", redirect: "/admin" },
  { email: "reviewer@pricecompare.vn", password: "Reviewer@123", role: "Reviewer", redirect: "/reviewer" },
];

function LoginScreen({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const acc = ACCOUNTS.find(a => a.email === email && a.password === password);
      if (!acc) {
        setError("Email hoặc mật khẩu không đúng");
        return;
      }
      onSuccess(acc);
    }, 400);
  }

  function quick(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
    setTimeout(() => onSuccess(acc), 150);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <BrandMark size={36} />
            <div className="text-2xl font-bold text-primary-700">SSCO</div>
          </div>
          <p className="mt-2 text-sm text-slate-600">Đăng nhập quản trị</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="text" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Vào nhanh</p>
          <div className="flex gap-2">
            {ACCOUNTS.map(a => (
              <button
                key={a.email}
                onClick={() => quick(a)}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-white"
              >
                {a.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, href, onClick, accent }) {
  const baseCls = "block rounded-xl border p-5 shadow-sm transition";
  const cls = {
    neutral: "border-slate-200 bg-white hover:shadow-md",
    amber: "border-amber-200 bg-amber-50 hover:shadow-md",
    primary: "border-primary-200 bg-primary-50 hover:shadow-md",
  }[accent || "neutral"];

  const Inner = (
    <>
      <p className={`text-sm ${accent === "amber" ? "font-medium text-amber-800" : accent === "primary" ? "font-medium text-primary-800" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent === "amber" ? "text-amber-900" : accent === "primary" ? "text-primary-900" : "text-slate-900"}`}>{value}</p>
    </>
  );

  if (onClick) {
    return <button onClick={onClick} className={`${baseCls} ${cls} text-left w-full`}>{Inner}</button>;
  }
  return <div className={`${baseCls} ${cls}`}>{Inner}</div>;
}

Object.assign(window, { Sidebar, LoginScreen, StatCard, BrandMark, ACCOUNTS });
