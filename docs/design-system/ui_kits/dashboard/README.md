# SSCO — Dashboard UI Kit (Admin + Reviewer)

Click-through recreation of the **authenticated** side of SSCO: login → admin dashboard (overview / categories) → reviewer dashboard (pending queue / AI generator). Built from `SSCO/frontend/app/login/page.tsx`, `app/admin/*`, `app/reviewer/*`, and `components/dashboard/Sidebar.tsx`.

## How to view
Open **`index.html`**. Two seeded accounts auto-route to the matching dashboard:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@kombe.vn` | `Admin@123456` |
| Reviewer | `reviewer@kombe.vn` | `Reviewer@123` |

Or hit the **"Vào nhanh"** quick-login buttons.

## Components
| File | Role |
| --- | --- |
| `Sidebar.jsx` | Fixed 224px sidebar with eyebrow + nav + logout (`Sidebar.tsx` recreation) |
| `Login.jsx` | Centered card on `primary-50 → slate-100` gradient |
| `StatCard.jsx` | Dashboard overview stat tiles + accent variants |
| `AdminOverview.jsx` | Stats grid + popular products / search trends panels |
| `AdminCategories.jsx` | Inline tree editor with create / edit / delete |
| `ReviewerOverview.jsx` | "Chờ duyệt" amber + "Tạo bài" primary tiles |
| `ReviewerPending.jsx` | Pending article list with approve/reject inline reason box |
| `ReviewerGenerate.jsx` | AI generator form — keyword + tone |

## Fidelity notes
- Real backend calls are stubbed in-memory — actions feel responsive but state resets on reload.
- Pending review uses the exact same color tokens as the codebase: amber-50/100/200/800/900 for status, green-600 for approve, red-300/600/700 for reject.
- Sidebar active item uses `bg-primary-600 text-white`; non-active hover uses `bg-white text-primary-700` over the slate-50 sidebar.
