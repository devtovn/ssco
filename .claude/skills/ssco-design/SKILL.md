---
name: ssco-design
description: Use this skill to generate well-branded interfaces and assets for SSCO (So Sánh Giá — a Vietnamese e-commerce price-comparison website), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference for SSCO

- **Brand:** SSCO ("So sánh giá") — Vietnamese price-comparison website. All UI text is in Vietnamese. Tone is friendly-professional, sentence case, no fluff, no exclamation points.
- **Stack:** Next.js 14 + Tailwind 3 + Heroicons 2 + Recharts. Inter font.
- **Primary palette:** Tailwind `sky` aliased as `primary` — `primary-600` (#0284c7) for CTAs, `primary-700` (#0369a1) for wordmark and hover.
- **Neutrals:** Tailwind `slate`. `slate-200` borders, `slate-900` body text.
- **Radii:** lean rounded — `rounded-2xl` cards, `rounded-xl` panels, `rounded-lg` form inputs, `rounded-full` chips.
- **Shadows:** `shadow-sm` at rest, `shadow-md` on hover, `shadow-lg` only on login & autocomplete.
- **Iconography:** Heroicons 24/outline for UI; **emoji for category tiles** (❄️📱💻🏠🎧, 🛒 fallback, 📦 empty image).
- **No gradient backgrounds** other than the soft `primary-50 → white` hero and the login `primary-50 → slate-100`.
- **One animation:** color/shadow transitions. Nothing else.
- **Currency format:** `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` → "28.490.000 ₫".

## Files in this skill

- `README.md` — full design system docs (content, visual foundations, iconography).
- `colors_and_type.css` — CSS variables ready to drop into any project.
- `assets/` — logo wordmark SVGs (horizontal, stacked, single-letter mark).
- `ui_kits/public_website/` — click-thru prototype + JSX components for the home, search, product, deals, category screens.
- `ui_kits/dashboard/` — click-thru prototype + JSX components for login, admin overview, admin categories, reviewer pending, reviewer AI generator.
- `preview/` — small HTML token cards (palette, type ramp, components) for reference.

## Designing for SSCO — checklist

1. **Read `README.md`** front-to-back before designing — especially CONTENT FUNDAMENTALS and VISUAL FOUNDATIONS sections.
2. **Pull components from `ui_kits/`** instead of building from scratch. The components there match the live codebase 1:1.
3. **Copy `colors_and_type.css`** into any new HTML file you generate; link Inter via Google Fonts.
4. **Don't add new emoji** outside the category-tile pattern.
5. **All UI text is Vietnamese.** If you don't know how to translate a phrase, ask — don't substitute English.
6. **No purple/violet, no orange, no teal.** The palette is sky + slate + (red / green / amber accents only).
