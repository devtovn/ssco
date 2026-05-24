# SSCO — Public Website UI Kit

Click-through high-fidelity recreation of the **public** (no-login) side of SSCO: home → search → product detail → deals. Built from `SSCO/frontend/app/page.tsx`, `app/search/page.tsx`, `app/san-pham/[id]`, `app/deals/page.tsx`, plus the components in `frontend/components/{home,search,product,shared,layout}`.

## How to view
Open **`index.html`** — it routes between fake screens client-side so you can interact with the full flow. No backend required.

## Components
| File | Role |
| --- | --- |
| `Header.jsx` | Sticky `bg-white/90` blur header with wordmark + nav |
| `SearchBar.jsx` | Hero search input with autocomplete dropdown |
| `PopularKeywords.jsx` | Rounded pill chips of popular searches |
| `CategoryGrid.jsx` | Emoji category tiles (2-col mobile → 5-col desktop) |
| `DealsSection.jsx` | "Ưu đãi tốt nhất" grid of deal cards with -% badges |
| `ProductCard.jsx` | Horizontal list-item product card (used in search) |
| `PriceComparisonTable.jsx` | Per-platform comparison rows w/ cheapest highlight |
| `PriceHistoryChart.jsx` | Simple inline SVG line chart for price history |
| `SearchFilters.jsx` | Sticky filters sidebar (sort, category, brand, price) |
| `Footer.jsx` | Slate-50 footer with ad zone |

## Fidelity notes
- Pixel-true Tailwind classes lifted from `SSCO/frontend`. Icons are inline SVG copies of Heroicons (24/outline).
- Product images use a tiny inline-SVG placeholder so the prototype runs offline. Real app loads from Tiki/Lazada CDNs via Next `<Image>`.
- Search suggestions are faked from a local list. Product detail uses 3 mocked listings (Tiki/Lazada/Shopee).
- Recharts is replaced by a hand-rolled inline-SVG line chart — visually equivalent.
