/* global React */
const { useState } = React;

// ─── Reviewer Overview ─────────────────────────────────────────────
function ReviewerOverview({ onNav, pendingCount }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tổng quan biên tập</h1>
      <p className="mt-1 text-sm text-slate-600">Trạng thái bài viết chờ xử lý</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Bài chờ duyệt" value={pendingCount} accent="amber" onClick={() => onNav("/reviewer/pending")} />
        <StatCard label="Tạo bài mới" value="Sinh nội dung bằng AI" accent="primary" onClick={() => onNav("/reviewer/generate")} />
        <StatCard label="Đã xuất bản tuần này" value="18" />
      </div>
    </div>
  );
}

// ─── Reviewer Pending list ─────────────────────────────────────────
const STATUS_LABELS = {
  draft: { label: "Nháp", cls: "bg-slate-200 text-slate-700" },
  pending_review: { label: "Chờ duyệt", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Đã duyệt", cls: "bg-blue-100 text-blue-800" },
  published: { label: "Đã xuất bản", cls: "bg-indigo-100 text-indigo-800" },
  rejected: { label: "Từ chối", cls: "bg-red-100 text-red-700" },
};

const INITIAL_ARTICLES = [
  { id: "a1", title: "iPhone 15 Pro Max — đánh giá chi tiết và so sánh giá tốt nhất", status: "pending_review", excerpt: "Bài viết tổng hợp cấu hình, đặc điểm nổi bật và bảng giá iPhone 15 Pro Max trên các sàn TMĐT Việt Nam." },
  { id: "a2", title: "Top 5 tủ lạnh inverter dưới 15 triệu đáng mua nhất 2026", status: "pending_review", excerpt: "So sánh dung tích, công nghệ và mức giá của 5 mẫu tủ lạnh inverter phổ biến nhất hiện nay." },
  { id: "a3", title: "Laptop văn phòng giá rẻ — chọn Asus, Acer hay HP?", status: "approved", excerpt: "Đánh giá thực tế các mẫu laptop văn phòng dưới 15 triệu của ba thương hiệu phổ biến." },
  { id: "a4", title: "Tai nghe bluetooth dưới 2 triệu chất lượng cao", status: "pending_review", excerpt: "Tuyển chọn tai nghe true-wireless và over-ear với mức giá hợp lý nhất." },
];

function ReviewerPending() {
  const [articles, setArticles] = useState(INITIAL_ARTICLES);
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function approve(id) {
    setArticles(articles.map(a => a.id === id ? { ...a, status: "approved" } : a));
  }
  function reject(id) {
    if (reason.trim().length < 5) { setError("Vui lòng nhập lý do từ chối (≥5 ký tự)"); return; }
    setArticles(articles.map(a => a.id === id ? { ...a, status: "rejected" } : a));
    setRejectId(null); setReason(""); setError("");
  }
  function publish(id) {
    setArticles(articles.map(a => a.id === id ? { ...a, status: "published" } : a));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Bài chờ duyệt</h1>
      <p className="mt-1 text-sm text-slate-600">Duyệt, từ chối hoặc xuất bản bài viết</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ul className="mt-6 space-y-4">
        {articles.map(a => {
          const s = STATUS_LABELS[a.status];
          return (
            <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 hover:text-primary-600 cursor-pointer">{a.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{a.excerpt}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === "pending_review" && (
                    <>
                      <button onClick={() => approve(a.id)} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">Duyệt</button>
                      <button onClick={() => setRejectId(a.id)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">Từ chối</button>
                    </>
                  )}
                  {a.status === "approved" && (
                    <button onClick={() => publish(a.id)} className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700">Xuất bản</button>
                  )}
                </div>
              </div>
              {rejectId === a.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Lý do từ chối (tối thiểu 5 ký tự)"
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => reject(a.id)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Xác nhận từ chối</button>
                    <button onClick={() => { setRejectId(null); setReason(""); setError(""); }} className="text-sm text-slate-600 hover:underline">Hủy</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {articles.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Không có bài chờ duyệt
          </li>
        )}
      </ul>
    </div>
  );
}

// ─── Reviewer AI Generate ──────────────────────────────────────────
function ReviewerGenerate({ onCreated }) {
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setLoading(false);
      setResult({
        title: `Đánh giá chi tiết: ${keyword}`,
        preview: `Bài viết AI vừa được sinh ra cho từ khóa "${keyword}" với giọng văn ${tone === "professional" ? "chuyên nghiệp" : tone === "casual" ? "thân thiện" : "kỹ thuật"}. Bài bao gồm mô tả sản phẩm, bảng so sánh giá từ Tiki / Lazada / Shopee, và phần kết luận đề xuất.`,
      });
    }, 900);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tạo bài viết AI</h1>
      <p className="mt-1 text-sm text-slate-600">Nhập từ khóa để sinh bài so sánh sản phẩm</p>

      <form onSubmit={submit} className="mt-6 max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Từ khóa</label>
          <input required minLength={2} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="VD: điện thoại samsung giá rẻ" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Giọng văn</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="professional">Chuyên nghiệp</option>
            <option value="casual">Thân thiện</option>
            <option value="technical">Kỹ thuật</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          {loading ? "Đang tạo bài..." : "Tạo bài viết"}
        </button>
      </form>

      {result && (
        <div className="mt-6 max-w-2xl rounded-xl border border-primary-200 bg-primary-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">AI vừa sinh xong</p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">{result.title}</h2>
          <p className="mt-2 text-sm text-slate-700">{result.preview}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => onCreated?.()} className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700">Gửi duyệt</button>
            <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Chỉnh sửa</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ReviewerOverview, ReviewerPending, ReviewerGenerate });
