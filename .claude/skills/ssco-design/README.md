# SSCO Design System

**SSCO** ("So Sánh Giá" = "Price Comparison" in Vietnamese) is a public Vietnamese price-comparison website that aggregates listings from Tiki, Lazada, Shopee, TikTok Shop and other Vietnamese retailers. Visitors can search and compare prices anonymously; the site monetizes through affiliate links and managed ad zones. Two authenticated roles — **Administrator** (system config, ads, reviewers, affiliate, categories, analytics) and **Reviewer** (AI-assisted article generation, edit, approve/reject, publish) — operate from sidebar dashboards behind `/login`.

This design system captures the **tokens, components, and screens** of the live SSCO frontend so future designs stay consistent.

---

## Sources used

| Source | Role | Notes |
| --- | --- | --- |
| `SSCO/` (mounted codebase) | **Primary source of truth** | Next.js 14 + Tailwind 3 + Heroicons + Recharts frontend. All tokens, copy, and components below were extracted from this codebase. |
| [`devtovn/ssco`](https://github.com/devtovn/ssco) (GitHub) | Mirror | The user's GitHub repo of the same project — the mounted folder was used in preference. Explore further if more recent work has landed there. |
| `SSCO/docs/` | Product & schema docs | Design notes, gadget schema, deployment guides |
| `SSCO/frontend/tailwind.config.ts` | Color tokens | Defines the `primary` (sky) palette. |
| `SSCO/frontend/app/layout.tsx` + `manifest.json` | Brand metadata | Theme color `#0ea5e9`, manifest name, font setup. |

> **For a more thorough design pass**, future work should pull the latest from `devtovn/ssco` directly — this system was built from a snapshot.

---

## What's in this folder

```
SSCO Design System/
├── README.md                  ← this file (brand overview, content + visual foundations, iconography)
├── SKILL.md                   ← machine-readable skill entry point
├── colors_and_type.css        ← CSS variables (colors, type, radii, shadows, spacing)
├── preview/                   ← design-system tab cards (logo, colors, type, radii, components)
├── assets/                    ← logos, brand marks
└── ui_kits/
    ├── public_website/        ← public-facing UI: home, search, product, deals
    │   ├── README.md
    │   ├── index.html         ← clickable interactive prototype across the public flow
    │   └── *.jsx              ← componentized Header, SearchBar, ProductCard, PriceComparison…
    └── dashboard/             ← Admin + Reviewer dashboards behind /login
        ├── README.md
        ├── index.html         ← login → admin/reviewer dashboards click-through
        └── *.jsx              ← Sidebar, StatCards, CategoryTree, PendingArticleList…
```

---

## CONTENT FUNDAMENTALS

**Language.** Everything is in **Vietnamese**, full diacritics. English is used only for proper nouns (Tiki, Lazada, Shopee, TikTok Shop, SEO, AI, JSON, PWA). The wordmark is the English-looking acronym **"SSCO"** with the descriptor **"So sánh giá"** in a smaller, lighter weight beside it.

**Tone.** Friendly-professional, direct, helpful. No marketing fluff, no exclamation points, no slogans. The site sells convenience — never "amazing deals 🔥🔥🔥". Sample copy directly from the codebase:

| Surface | Copy |
| --- | --- |
| Hero H1 | *"So sánh giá từ Tiki, Lazada, Shopee"* |
| Hero subhead | *"Tìm giá tốt nhất trước khi mua — không cần đăng nhập"* |
| Search placeholder | *"Tìm sản phẩm: iPhone, laptop, tủ lạnh..."* |
| Empty product price state | *"Chưa có dữ liệu giá cho sản phẩm này."* |
| Reviewer empty queue | *"Không có bài chờ duyệt"* |
| Empty form error | *"Vui lòng nhập lý do từ chối"* |

**Casing.** Sentence case in body and headings. Buttons are sentence case too ("Tìm kiếm", "Mua ngay", "Đăng nhập", "Duyệt", "Từ chối"). All-caps reserved for the sidebar eyebrow only ("BẢNG ĐIỀU KHIỂN") and the deal % badge ("-25%").

**Voice / person.** The product **never says "I"**. The dashboard refers to data and the user implicitly ("Tổng quan", "Sản phẩm phổ biến"). User stories in spec docs use "Tôi muốn…" but that phrasing is for internal docs, not UI copy. Microcopy is **imperative or noun-led**: "Đăng nhập", "Tạo bài viết", "Bộ lọc", "Sắp xếp".

**Numbers & dates.** Vietnamese locale formatting. Currency: `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` → "1.299.000 ₫". Dates: `toLocaleString('vi-VN')`. Compact axis labels use `Intl.NumberFormat('vi-VN', { notation: 'compact' })`.

**Emoji.** **Yes, emoji is part of the brand** — and is used in exactly two places:
1. **Category tiles**: `❄️ Điện lạnh`, `📱 Điện thoại`, `💻 Laptop`, `🏠 Thiết bị gia dụng`, `🎧 Âm thanh & Hình ảnh`. The default fallback when no icon is mapped is `🛒`.
2. **Empty product image fallback**: `📦` displayed center inside the grey square.

No emoji in headings, body copy, buttons, or error messages. **Don't add new emoji** elsewhere; the system intentionally leaves the rest of the interface emoji-free.

**Vibe.** Calm, practical, utility-first — a shopping tool, not a magazine. Lots of white space, simple grids, no decorative gradients beyond the soft `primary-50 → white` hero wash. The brand voice is closer to a Vietnamese version of Google Shopping or Pricepally than to a Shopee-style colorful marketplace.

---

## VISUAL FOUNDATIONS

### Colors
- **Primary** is the Tailwind **sky** palette aliased as `primary-50` through `primary-950`. The lock-in shade is `primary-600` (#0284c7) for CTAs and `primary-700` (#0369a1) for the wordmark and CTA hover. Theme color in the PWA manifest is `primary-500` (#0ea5e9).
- **Neutrals** are Tailwind **slate** (50–950). `slate-900` text on white, `slate-600` for secondary, `slate-500` for muted, `slate-400` for placeholders / struck-through prices. Borders are universally `slate-200`; secondary borders / form fields use `slate-300`.
- **Semantic accents**:
  - **Discount red** — `red-500` background, white text, used **only** for the "-25%" deal badge.
  - **In-stock green** — `green-600` text for "Còn hàng" and the "Duyệt" approve button; `green-100/-800` pill for "Rẻ nhất".
  - **Pending amber** — `amber-50/-100/-200/-800/-900` for the Reviewer "Chờ duyệt" status pill and overview card.
  - **Reject red** — `red-50/-300/-600/-700` for the reject CTA and error messages.

### Type
- **Inter** sans-serif, loaded via Next.js `var(--font-inter)` with system fallbacks. Vietnamese diacritics covered.
- Weights actually used: **400, 500, 600, 700**. Italic is never used.
- The site uses **font-bold (700)** for hero H1, section H2s, page H1s, and price callouts. **font-semibold (600)** for product names, labels, and primary button text. **font-medium (500)** for nav links, sidebar items, smaller buttons.
- `tracking-tight` (-0.02em) on the hero H1 only. `text-balance` is opt-in via a utility class on the hero.
- Mobile-first ramp; the only responsive bump is `text-4xl md:text-5xl` on the hero. Dashboards stay `text-2xl` even on desktop.

### Spacing & layout
- 4px-step Tailwind scale. **Cards = `p-4` (16px)**, large cards / login surface = `p-6` or `p-8`. Section vertical padding alternates `pt-12 pb-16` (hero) and `py-8` (interior pages).
- Container: `max-w-6xl mx-auto px-4` (1152px) everywhere on public pages. Dashboard pages occupy `flex-1` next to a fixed 224px (`w-56`) sidebar.
- Grids: product cards use `gap-4`; category tiles `grid-cols-2 sm:grid-cols-3 md:grid-cols-5`; deals `sm:grid-cols-2 lg:grid-cols-4`.

### Backgrounds
- **Page background is white.** No textures, no patterns, no photography backgrounds.
- The **only gradient** is the hero `bg-gradient-to-b from-primary-50 to-white`, plus the login page's `bg-gradient-to-br from-primary-50 to-slate-100`. Both are extremely soft.
- Dashboards use `bg-slate-100` for the page and `bg-slate-50` for the sidebar; cards inside are pure white.
- The header uses `bg-white/90 backdrop-blur` — the **only** place backdrop blur appears.
- No full-bleed imagery, no illustrations, no hand-drawn elements. Product images come from real e-commerce listings (Tiki/Lazada CDN URLs).

### Borders & shadows
- **Borders are universal** — `1px solid var(--slate-200)` on every card, every input, every panel. Borders are how surfaces are separated, not shadows.
- Resting shadow: **`shadow-sm`** (`0 1px 2px rgb(0 0 0 / 0.05)`). Hover/active elevation: **`shadow-md`**. Only one element uses `shadow-lg`: the login card and search-suggestions dropdown.
- No inner shadows. No colored shadows. No glow effects.

### Corner radii
- The system leans **rounded**. Tokens:
  - `rounded-2xl` (24px) — product cards, deal cards, category tiles, the search bar input.
  - `rounded-xl` (16px) — panels, stat cards, login card, suggestion dropdown, "Mua ngay" button.
  - `rounded-lg` (12px) — form inputs, secondary buttons, sidebar nav items, error banners.
  - `rounded-full` — popular-keyword chips, status pills.
- Buttons follow the radius of the container they sit in (so the round-corner aesthetic is preserved at every level).

### Hover / press / focus
- **Hover state on cards** = bump from `shadow-sm` to `shadow-md`. Optionally also `border-primary-300` on category tiles.
- **Hover state on text links** = `text-primary-600` → `text-primary-700`. No underline.
- **Hover state on buttons** = darken by one shade (e.g., `bg-primary-600` → `bg-primary-700`, `bg-green-600` → `bg-green-700`).
- **Press state**: not styled explicitly — Tailwind default + browser focus ring.
- **Focus ring**: `focus:ring-2 focus:ring-primary-500` (or `primary-200` for softer fields). Borders also switch to `border-primary-400` on focus.
- **Disabled**: `disabled:opacity-60` on buttons, `disabled:opacity-40` on pagination.

### Animation
- Almost none. The only motion is CSS `transition` on color and shadow properties (default duration), and a 300ms debounce on the search autocomplete fetch.
- No bounces, no spring physics, no entrance animations on cards. The site feels static and snappy — that is intentional.

### Transparency & blur
- One place only: **the sticky `<Header>` uses `bg-white/90 backdrop-blur`** to feel light over scrolled content. Nothing else uses transparency.

### Imagery vibe
- Product photos come straight from e-commerce CDNs — clean white-background product shots. The system **does not filter or tint them**; they show as-is at object-cover inside a `bg-slate-100` rounded frame.
- When no image is available, the slot shows the `📦` emoji centered on `bg-slate-100`.

### What a card looks like
```
[ rounded-2xl, border slate-200, bg-white, shadow-sm ]
[ optional aspect-square image well in bg-slate-100 ]
[ p-4: name (semibold slate-900) → price (bold primary-600) → source (slate-500 xs) ]
[ on hover: shadow-md ]
```

### Fixed elements
- Sticky public header (transparent-blur).
- `lg:sticky lg:top-4` on the search results filter sidebar.
- Mobile-first; nothing else is pinned.

---

## ICONOGRAPHY

**Primary icon system: Heroicons (24/outline).** `@heroicons/react@^2.2.0` is a dependency. The codebase only directly imports `MagnifyingGlassIcon`, but Heroicons is the contract for any future icon work. Use **24px outline** for inline UI icons (search, navigation, status). Use **20px solid** sparingly for filled emphasis.

- **CDN for prototypes** (this design system uses this approach in `ui_kits/`): `https://unpkg.com/heroicons@2.2.0/24/outline/<icon>.svg` or the inline-SVG list.

**Category iconography is emoji**, not Heroicons or custom SVG. This is a deliberate, low-cost choice that works well in the Vietnamese market context. The mapping is hard-coded in `CategoryGrid.tsx`:

| Slug | Emoji | Vietnamese name |
| --- | --- | --- |
| `dien-lanh` | ❄️ | Điện lạnh |
| `dien-thoai` | 📱 | Điện thoại |
| `laptop` | 💻 | Laptop |
| `thiet-bi-gia-dung` | 🏠 | Thiết bị gia dụng |
| `am-thanh-hinh-anh` | 🎧 | Âm thanh & Hình ảnh |
| *(default)* | 🛒 | — |
| *(no product image)* | 📦 | — |

Required spec categories not yet mapped (will fall back to 🛒): `máy tính bảng`, `cơ khí`, `thiết bị văn phòng`, `phụ kiện điện tử`, `đồ gia dụng nhà bếp`. **Open question for the design team**: keep emoji or replace with Heroicons / custom outline marks?

**Unicode characters as glyphs** — yes, in two places:
- `→` in the "Xem tất cả →" link in deals section.
- `·` between metadata (e.g., search results count · time).
- `—` (em dash) in headers ("SSCO — So sánh giá").

**No custom SVG illustrations, no Lottie, no spot illustrations.** If you need an illustrative moment (empty state, onboarding), the current convention is a single large emoji centered on a soft background, or just spare typography. Resist the urge to introduce 3D objects or doodles.

**Logo / wordmark.** The brand mark is a **magnifying glass with the letter "S" inside the lens** — a direct visual reference to the product (search and compare). The mark is rendered in `primary-600` stroke with a white lens fill, paired with the bold "SSCO" wordmark in `primary-700` and the "So sánh giá" descriptor in `slate-500`. Lockups available in `assets/`:

- `assets/logo-wordmark.svg` — horizontal lockup (mark + SSCO + So sánh giá)
- `assets/logo-wordmark-stacked.svg` — stacked lockup (mark above wordmark)
- `assets/favicon-mark.svg` — mark only, transparent background
- `assets/app-icon.svg` — mark in white on a `primary-600` rounded-square tile (favicon / PWA icon)

The mark is now embedded into the live UI kits — see the public website Header and the dashboard Login/Sidebar.

---

## ⚠️ Caveats & substitutions

1. **No logo file existed in the codebase originally** — I designed the magnifying-glass + S mark to match the product (search/compare). All variants live in `assets/`. **Tell me if you want the lens-color, the S weight, the stroke thickness, or the overall composition tweaked** — this is the easiest thing to iterate on.
2. **No favicon / PWA icon PNG files.** `assets/app-icon.svg` is ready to export. If you want PNG/ICO at 192/512, ping me.
3. **No product photography.** Real product images come from external CDNs at runtime; the UI kits use small inline SVG product placeholders so the prototype works offline.
4. **Spec lists 10 main categories; the codebase ships emoji for only 5.** I retained the existing mapping and left the others falling back to 🛒. Should the rest get emoji mapped (suggested: 📲 tablet, 🔧 cơ khí, 🖨️ văn phòng, 🔌 phụ kiện, 🍳 nhà bếp)? Or pivot the whole category set to outline icons?
5. **Inter is loaded via `next/font` in the live app** — for these static design files I link Inter via Google Fonts. If you want strict offline parity, please drop the actual Inter `.woff2` files into `fonts/` and update the CSS.
6. **Tone of the emoji-driven category UI** is friendly and pragmatic but may feel under-designed for a polished product. The visual-foundations work above documents this as-is; if the team wants to evolve away from emoji, that's a design exercise worth scheduling.

---

## Index / where to look first

- Building a new public-facing screen → **`ui_kits/public_website/`** (Header, SearchBar, ProductCard, PriceComparisonTable, PriceHistoryChart, CategoryGrid, DealsSection).
- Building a new dashboard surface → **`ui_kits/dashboard/`** (Login, Sidebar, StatCard, CategoryTree, PendingArticleList).
- Need exact tokens → **`colors_and_type.css`**.
- Doing a slide deck or external asset → use the wordmark from **`assets/logo-wordmark.svg`** and the palette from `colors_and_type.css`.
