# ICA 6: Data fetching, rendering, loading states and performance

Each member records the work on the pages they own. Lighthouse reports are in
[docs/lighthouse/](docs/lighthouse/README.md).

---

## Oshadhi: admin pages 27–34

| # | Page | Route |
|---|---|---|
| 27 | Admin Login | `/admin/login` |
| 28 | Admin Dashboard | `/admin` |
| 29 | Entrepreneur Registration Approval | `/admin/entrepreneurs/approvals` |
| 30 | Entrepreneur Details | `/admin/entrepreneurs/[id]` |
| 31 | Entrepreneur Management | `/admin/entrepreneurs` |
| 32 | Product Approval | `/admin/products/approvals` |
| 33 | Admin Product Details | `/admin/products/[id]` |
| 34 | Product Management | `/admin/products` |

### 1. Data fetching on the server

**Before:** six of the eight pages (29–34) were whole-page Client Components (`"use client"`).
The browser downloaded an empty page, ran the JavaScript, then called `/api/admin/...` from
`useEffect`. Admins saw "Loading..." first and the data one extra round trip later.

**Now:** every `page.tsx` is an async Server Component. It:

1. checks the admin session on the server (`requireAdminPage()`). Middleware can only see that
   a cookie is validly signed, not that it was revoked by logout, so a revoked session is sent
   to `/admin/login`;
2. reads `?tab=`, `?status=`, `?search=` and `?page=` with a Zod schema. A bad value (e.g.
   `?page=abc`) falls back to the default instead of breaking the page;
3. calls the data function directly (no HTTP request to our own API);
4. passes plain, serialisable data (numbers and ISO date strings) to a small Client Component
   that handles only the interactive parts.

| Page | Data function | Client Component (interactive parts only) |
|---|---|---|
| Admin Dashboard | `getDashboardData` (`lib/admin/dashboard.ts`) | `AdminDashboardBody`: header search, activity filter |
| Registration Approval | `getEntrepreneurList` + `countPendingEntrepreneurs` | `EntrepreneurApprovalsView`: tabs, pagination |
| Entrepreneur Details | `getEntrepreneurDetails` | `EntrepreneurDecisionBar`: back, Approve / Reject |
| Entrepreneur Management | `getEntrepreneurList` | `EntrepreneurManagementView`: tabs, search, pagination, Delete |
| Product Approval | `getProductList` | `ProductApprovalsView`: tabs, pagination, quick Approve / Reject |
| Admin Product Details | `getProductDetails` + `getCategoryOptions` | `ProductDecisionButtons`, `CategorySelect`, `AdminNotesForm` |
| Product Management | `getProductList` | `ProductManagementView`: tabs, search, pagination, Delete |
| Admin Login | (none, static) | `AdminLoginForm` |

On the details pages (30, 33) the page itself, including the profile, product details,
images and timeline, renders on the server. Only the buttons and form fields are Client
Components.

The API routes (`/api/admin/entrepreneurs`, `/api/admin/products` and their `[id]` routes)
now call the **same** functions in `lib/admin/`, so each query exists once and the existing
API security tests still cover it.

**Parallel requests.** Independent queries run together with `Promise.all`: the list count
and the page of rows, the queue and the pending total, the product and the category list,
and the dashboard's eight figures.

**Pagination and limits.** Every list loads one page (10 rows) from the database with
`skip`/`take`. **Search now runs in the database across every page.** Before, the
browser-side search only looked through the rows already loaded. Entrepreneur Details shows
at most the latest 50 products, with the real total.

**Only the fields the page needs.** Every query uses `select`. The detail functions name the
User fields they return (name, email, phone), so password hashes, reset tokens and session
versions can never reach a Client Component. They are also hidden globally by the Prisma
client. Admin Product Details no longer loads the seller's email, which it never showed.
Tests check the rendered pages for secrets (see section 5).

### 2. Rendering and caching

`next build` before → after:

| Page | Before | After | Why |
|---|---|---|---|
| Admin Login | `○` Static | `○` Static | Same for everyone; prebuilt and served instantly. |
| Admin Dashboard | `ƒ` Dynamic | `ƒ` Dynamic | Live platform figures for signed-in admins only. |
| Registration Approval | `○` Static (empty shell) | `ƒ` Dynamic | New registrations arrive any time; admins act on them. |
| Entrepreneur Details | `ƒ` Dynamic (empty shell) | `ƒ` Dynamic | Private contact details; status must be current to decide. |
| Entrepreneur Management | `○` Static (empty shell) | `ƒ` Dynamic | Private account data; admins delete from here. |
| Product Approval | `○` Static (empty shell) | `ƒ` Dynamic | Queue changes whenever a seller submits. |
| Admin Product Details | `ƒ` Dynamic (empty shell) | `ƒ` Dynamic | Internal notes; status must be current to decide. |
| Product Management | `○` Static (empty shell) | `ƒ` Dynamic | Includes unpublished products; admins delete from here. |

"Empty shell" means the page itself was prebuilt with no data, and the data was fetched
afterwards in the browser.

**No private data in a shared cache.** None of these pages, and none of their data
functions, are cached across requests or users. Every request checks the session before it
reads anything. ISR and `generateStaticParams` don't fit any of these pages: all except
the login page are private and must be current. The login page is fully static.

`getCurrentUser()` and the two detail functions are wrapped in React `cache()`. This only
removes duplicate queries **within one request** (the page and its `generateMetadata` share
one session lookup and one product query). It never shares data between requests or users.

**Fresh data after every change.**

- Approve / reject / delete an entrepreneur, approve / reject / delete a product, or move a
  product to another category: the route calls `revalidatePath("/", "layout")`
  (`lib/admin/revalidate.ts`). These change what the public site shows (marketplace,
  categories, product and business pages), as well as the admin lists and dashboard.
- Save internal notes: `revalidatePath("/admin", "layout")`, because only admins see notes.
- On the page, after the API call returns, the Client Component calls `router.refresh()`,
  which re-renders the page on the server. What the admin sees is what is in the database,
  including after a 404 or 409 when someone else changed the record first.
- Tabs, search and page number live in the URL (`?tab=REJECTED&search=batik&page=2`), so each
  change fetches fresh data, links can be shared, and Back/Forward work.

**Page titles.** Static pages export `metadata`. Entrepreneur Details and Admin Product
Details use `generateMetadata` to show the business or product name in the tab. It checks
the session first, so nothing is looked up for a visitor who isn't an admin.

### 3. Loading, error and empty states

| | Where | What it does |
|---|---|---|
| Loading | `loading.tsx` in each route folder | Sidebar and header appear at once, with grey skeleton blocks shaped like the table, stats or details that are coming (`AdminPageSkeleton`). |
| Error | `error.tsx` in each route folder | Plain message ("We couldn't load this page") and a **Try again** button that re-runs the server render. The real error is only logged; the user sees a reference number, never a message or stack trace (`AdminPageError`). |
| Not found | `notFound()` + `not-found.tsx` for `[id]` pages | An unknown or malformed id shows "Entrepreneur / Product not found" with a link back, instead of a blank page. |
| Empty | each list | A clear message per case, e.g. "No applications are waiting for review…", "No products match "batik".", "No rejected entrepreneurs." |
| Updating | each list | While a tab, search or page change loads, the table dims and the counter says "Updating...". |
| Action errors | each button | Shown inline next to the button (e.g. the 409 "has orders in its history" message), instead of `alert()`. |

### 4. Performance

- **Server data, no extra round trip:** the data is in the first HTML response. There is no
  "Loading..." screen followed by a second request.
- **`next/image`:** product thumbnails (44–48 px), product images and the sidebar logo. The
  logo file is 1239 × 1254 px and was downloaded **twice at full size** on every admin page
  (phone top bar and sidebar). It is now a 32/36 px resized copy. Product images are resized
  and lazy-loaded; the first image on Admin Product Details loads with `priority`.
- **`next/font`:** already used for the Geist fonts in `app/layout.tsx`.
- **Unused packages removed:** `resend` (email uses `nodemailer`) and a package called
  `package.json` that was installed by mistake and pulled in about 80 old sub-packages
  (`got`, `rc`, `registry-url` and others). `lucide-react` icons are imported one by one, so only
  the icons used are bundled. No heavy client-only libraries are used on these pages, so
  nothing needed `dynamic()` import.
- **Database indexes** (migration `20261014150000_admin_page_indexes`):

| Index | Used by |
|---|---|
| `EntrepreneurProfile(status, appliedAt)` | Registration Approval and Entrepreneur Management: filter by status, newest first. Replaces `(status)`. |
| `EntrepreneurProfile(appliedAt)` | Dashboard: latest applications. |
| `Product(status, createdAt)` | Product Approval and Product Management: filter by status, newest first. Replaces `(status)`. |
| `Product(createdAt)` | Dashboard: latest submissions. |
| `ProductImage(productId, sortOrder)` | First image of each product (thumbnails), images in order. There was no index at all. |
| `Order(businessId, status)` | Verified sales per business (Sales Volume column). Replaces `(businessId)`. |
| `OrderItem(productId)` | Sales count per product, and the "ever ordered?" check before delete. There was no index. |
| `OrderItem(orderId)` | Loading an order's items. There was no index. |

### 5. Tests

`tests/admin-moderation-pages.test.ts` (33 tests) renders the Server Components directly
against a real PostgreSQL database:

- each of the six pages redirects visitors without a session, entrepreneurs, and **revoked
  admin sessions** (validly signed cookie after logout) to `/admin/login`;
- lists come one page at a time, with real totals; tab, page and search are read from the
  URL; bad values fall back to defaults;
- search finds a row that is not on the first page;
- props passed to Client Components contain no password hash, reset token or session
  version, and the lists and product details don't include emails they don't show;
- unknown or malformed ids give `notFound()`; `generateMetadata` checks the session;
- approve / reject / delete / category change call `revalidatePath("/", "layout")`; notes
  only revalidate `/admin`; refused changes (403, 409) revalidate nothing.

The existing tests (`admin-dashboard`, `admin-login`, `admin-entrepreneurs`,
`admin-products`, `approval-flow`) still pass against the refactored API routes.

### 6. Lighthouse (mobile, production URL)

Reports: `docs/lighthouse/oshadhi/`. Target: Performance ≥ 80 and LCP < 2.5 s.

| # | Page | Perf before | Perf after | LCP before | LCP after |
|---|---|---|---|---|---|
| 27 | Admin Login | | | | |
| 28 | Admin Dashboard | | | | |
| 29 | Registration Approval | | | | |
| 30 | Entrepreneur Details | | | | |
| 31 | Entrepreneur Management | | | | |
| 32 | Product Approval | | | | |
| 33 | Admin Product Details | | | | |
| 34 | Product Management | | | | |

_To be filled in from the production reports._
