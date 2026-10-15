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
- **Database indexes** (migration `20261015120000_admin_page_indexes`):

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

---

## Dewmi's pages

Production URL: https://www.startupspark.shop/
Repository: https://github.com/dewvithanage/Nexus-Dev-Solutions-

This file describes Dewmi's scoped changes. It does not claim other members' development work or complete production evidence.

### Ownership

| Member | GitHub username | Owned features / routes |
| --- | --- | --- |
| Dewmi | dewvithanage | WhatsApp confirmation, reviews, About, Gallery, entrepreneur registration, login, forgot password, reset password and dashboard (routes below) |
| Other team members | Team to supply verified usernames | Team to supply each member's own routes; not inferred from branch names |

### Rendering decisions

| Route | Mode | Reason |
| --- | --- | --- |
| `/order-confirmation/[orderId]` | Dynamic | Private buyer data requires the correct order access token on every request; never shared-cached. |
| `/products/[productId]/reviews` | Dynamic | Server-rendered, paginated reviews and current product/seller approval checks; mutations invalidate this path. |
| `/products/[productId]/review` | Dynamic | Server checks current visibility and passes only public product identity to the interactive form. |
| `/about` | Dynamic, streamed statistics | The marketing shell streams first while parallel live database counts load. |
| `/gallery` | Dynamic | Paginated database images reflect admin uploads/deletions on navigation without changing another member's admin endpoints. |
| `/entrepreneur/register` | Static shell + client form | No database query is needed to display the form; submission uses strict server validation. |
| `/entrepreneur/login` | Static shell + client form | No account data in the initial HTML; successful sign-in refreshes the router after the session cookie changes. |
| `/entrepreneur/forgot-password` | Static shell + client form | No account data in the shared shell; reset requests stay server-side. |
| `/entrepreneur/reset-password` | Static shell + Suspense/client form | The token is read inside the client form; no private account data is prerendered or cached. |
| `/entrepreneur/dashboard` | Dynamic, streamed sections | Database session and approval checks happen before rendering; seller-specific stats are never placed in a persistent shared cache. |

Public detail pages here are not pre-generated with `generateStaticParams`: they must check current publication/approval or private token access. Dynamic product review pages use `generateMetadata`; other owned pages have descriptive metadata.

### Data fetching and freshness

Initial Gallery, review-list, review-form product identity and guest order details now come directly from server data functions, without a browser `useEffect` fetch or server HTTP call to our own API. Gallery lists are limited to 24 images and reviews to 20 rows per page. Independent list/count or list/summary queries run in parallel. Queries select only the required fields.

A submitted review and its rating summary save together; `revalidatePath` invalidates the review routes, followed by client navigation and router refresh. Other owned database views intentionally have no persistent data cache, so each navigation reads current data. Personalized data has no shared cache.

Each owned route has a loading skeleton and retry boundary. Missing or unauthorized product/order records call `notFound()`; lists have explicit empty states. About and dashboard use Suspense to stream slower sections.

Images on the owned Gallery/About pages use `next/image`; the existing site font setup uses `next/font`. There are no heavy client-only libraries in the new form components that require a dynamic import. The query-index migration is `prisma/migrations/20261015090000_dewmi_page_query_indexes/migration.sql`; it was authored but has not been run.

### Production evidence: pending completion

Before reports, when successfully collected, are the unedited Lighthouse JSON/HTML outputs in `docs/lighthouse/`. They measure the current production deployment, not these undeployed local changes. After reports must be collected from the same production routes after the reviewed changes are deployed. Do not substitute localhost measurements, missing-record pages, or edited scores.

| Page | Before performance / LCP | After performance / LCP |
| --- | --- | --- |
| About | 97 / 1.99 s | Pending production deployment |
| Gallery | 64 / 5.65 s | Pending production deployment |
| Login | 100 / 1.61 s | Pending production deployment |
| Registration | 100 / 1.81 s | Pending production deployment |
| Forgot Password | 100 / 1.89 s | Pending production deployment |
| Reviews | 82 / 2.17 s | Pending production deployment |
| Write Review | 98 / 2.14 s | Pending production deployment |
| WhatsApp Confirmation | Pending an authorized real order measurement | Pending production deployment |
| Reset Password | Pending a valid reset-flow measurement | Pending production deployment |
| Dashboard | Pending authenticated measurement | Pending production deployment |

Target: mobile Performance >= 80 and LCP < 2.5 seconds. No improvement or score is claimed before production reports exist.

Production build-log route-table screenshot: pending the hosting-service build of the release commit. Local build output is not production evidence.

### Release requirements for the team

- Supply the remaining member/username/route ownership rows.
- The shared `/api/version` endpoint must return the deployed commit SHA. Implementing or changing shared release infrastructure is outside Dewmi's requested page scope.
- Another member must review and approve the PR into development; CI must pass. Release development into main through a reviewed PR.
- Tag the final approved commit `ica6`, deploy that exact commit, and verify `/api/version` matches the tag.
- Apply the committed migration through the team's approved deployment workflow, not against live data during these local changes.
- Run the production core flow, private-user isolation checks, mobile before/after Lighthouse and slow-network/error-state checks.

No migration, Git push, production deployment, or release tag was performed in this task.

### Baseline findings

Seven valid mobile production baselines were collected on 15 October 2026 in a headless private Edge session. Original JSON and HTML reports are saved, unchanged, under `docs/lighthouse/before-*.report.*`. These are the current deployed site's results, not the local changes' results.

Gallery's 64 Performance score and 5.65-second LCP miss both targets. This update removes its browser-only initial API fetch, renders image URLs in the server HTML, prioritizes the first image and limits/paginates the list. About and the three measured authentication pages meet the target; see the table for the two review pages. After deployment, repeat measurements under comparable conditions to determine whether performance actually improved.

Review baseline product: `/products/cmutt62c70001kr40aelhshyj` (Chocolate Cup Cake), an existing publicly listed product during measurement. No review was submitted.

Scoped verification: 13 isolated server-rendering/query tests passed, TypeScript passed, and the scoped lint check passed without warnings. These tests use mocked database calls and verify that gallery/review data is present in server HTML. Live database behavior and the unapplied indexes still require the approved deployment/CI workflow.
