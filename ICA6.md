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

Target: Performance ≥ 80 and LCP < 2.5 s.

Both runs used `https://www.startupspark.shop` on 16 October 2026, Lighthouse's default
mobile settings (emulated phone, throttled network), a fresh browser profile and the same
admin account. **Before** is the version live before PR #105; **after** is the same pages once
#105 was deployed and the index migration was applied. The detail pages used the same
entrepreneur and the same product both times. Each page was run once, so scores can move a
few points between runs. The finished-report URL was checked for every page, so none of
them measured the login page instead.

| # | Page | Perf before | Perf after | LCP before | LCP after | TBT before | TBT after |
|---|---|---|---|---|---|---|---|
| 27 | Admin Login | 92 | **95** | 1.7 s | 2.3 s | 325 ms | 199 ms |
| 28 | Admin Dashboard | 90 | **95** | 2.7 s | 2.1 s | 300 ms | 231 ms |
| 29 | Registration Approval | 82 | **93** | 3.1 s | 2.0 s | 441 ms | 292 ms |
| 30 | Entrepreneur Details | 87 | **97** | 2.9 s | 2.1 s | 319 ms | 173 ms |
| 31 | Entrepreneur Management | 73 | **88** | 3.3 s | 1.7 s | 836 ms | 463 ms |
| 32 | Product Approval | 81 | **93** | 3.0 s | 2.3 s | 541 ms | 261 ms |
| 33 | Admin Product Details | 76 | **96** | 3.3 s | 2.1 s | 664 ms | 185 ms |
| 34 | Product Management | 62 | **99** | 3.3 s | 1.6 s | 6,326 ms | 79 ms |
| | **Average** | **80** | **95** | | | | |

- All eight pages now meet both targets (Performance 88–99, LCP 1.6–2.3 s). Before, three
  pages were under 80 and only Admin Login had LCP under 2.5 s.
- The biggest gain is Product Management (62 → 99): its blocking time fell from 6.3 s to
  0.08 s because the list is now rendered on the server instead of built in the browser.
- Admin Login's LCP went up from 1.7 s to 2.3 s in this single run but stays under the
  target, and its score still rose.
- Accessibility averaged 95 before and 99 after. SEO on pages 30 and 33 is 91 because they
  have no meta description; admin pages are private and not indexed, so this has no effect.

The HTML reports are not committed: the signed-in admin pages show applicants' personal
details and order data in the report screenshots. They are kept by the page owner and
submitted directly with the assessment.

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

---

## Shehani: public storefront, cart and checkout

| Page | Route |
|---|---|
| Home | `/` |
| Marketplace | `/marketplace` |
| Search results | `/marketplace/search?q=` |
| Categories | `/categories` |
| Category details | `/categories/[slug]` |
| Product details | `/products/[productId]` |
| Shopping Cart | `/cart` |
| Checkout (Order Form) | `/checkout/[businessId]` |

### 1. Data fetching on the server

**Before:** the six catalogue pages (Home, Marketplace, Search results, Categories, Category
details, Product details) were whole-page Client Components (`"use client"`). The browser
downloaded an empty page, ran the JavaScript, then called `/api/categories`,
`/api/marketplace/products` or `/api/products/[id]` from `useEffect`. Visitors saw skeletons
first and the products one extra round trip later.

**Now:** each of these `page.tsx` files is an async Server Component. It calls a data function
in `lib/public-queries.ts` directly (no HTTP request to our own API) and passes plain,
serialisable data (prices and dates as strings) to the page or to a small Client Component.

| Page | Data function | Client Component (interactive parts only) |
|---|---|---|
| Home | `getHomeCategories`, `getFeaturedProducts` | (none; product cards are server-rendered) |
| Marketplace | `getHomeCategories` + `getMarketplaceProducts` (in parallel, `Promise.all`) | `MarketplaceClient`: category, price and sort filters, pagination |
| Search results | `getSearchProducts` | (none) |
| Categories | `getHomeCategories` | (none) |
| Category details | `getCategoryWithProducts` | (none) |
| Product details | `getProductDetails` (page and `generateMetadata`) | `ProductDetailsClient`: image gallery, quantity, Add to Cart, Buy Now |
| Shopping Cart | (none: the cart is in the browser) | whole page |
| Checkout | (none until the order is sent) | whole page |

**Only public products.** Every query uses the shared `publicProductWhere` rule
(`lib/public-visibility.ts`): a product appears only when it is approved **and** its seller's
registration is approved. Rejecting a seller hides all their listings at once.

**Only the fields the page needs.** Every query uses `select` or a limited `include`
(first image, business name). Product details returns the seller's name, university and
WhatsApp number, which the page shows, and never the seller's email, password hash, reset
token or the admin's internal notes. Tests check this (section 5).

**Limits.** The Marketplace loads one page (4 products) with `skip`/`take` and a real total.
Search results and Category details return at most 48 products, with the real total shown.

**Marketplace filters.** The first page comes from the server. When the visitor changes the
category, price or sort, `MarketplaceClient` calls `/api/marketplace/products`. If they change
a filter again before the answer arrives, the old request is cancelled (`AbortController`),
so an old result can never replace a newer one.

**Cart and Checkout.** Customers are guests with no account, so the cart is kept in the
browser's `localStorage` (`lib/cart-context.tsx`) and never on the server. The checkout sends
only product ids and quantities to `POST /api/orders`. The server takes prices from the
database, checks every product is still public and belongs to that business, reserves stock
in a transaction (two buyers can't both get the last item), and allows at most 10 orders per
device per hour. The buyer then gets a secret token for the order confirmation page.

### 2. Rendering and caching

| Page | Rendering | Why |
|---|---|---|
| Home | Dynamic (`connection()`), sections streamed | Categories and Trending each load inside their own `<Suspense>`, so the hero and "How it works" appear at once. |
| Marketplace | Cached page, `revalidate = 60` | Same first page for every visitor; refreshed at most every 60 s. |
| Search results | Dynamic | Depends on `?q=`; results come from the 60-second data cache, keyed by the search text. |
| Categories | Cached page, data refreshed every 60 s | Same for every visitor. |
| Category details | Rendered on first visit per category, then cached for 60 s | Same for every visitor of that category. |
| Product details | Rendered on first visit per product, `revalidate = 60` | Same for every visitor of that product. |
| Shopping Cart | Static shell + client | The cart only exists in the visitor's browser. |
| Checkout | Static shell + client | The form and summary come from the visitor's cart. |

The rendering modes are taken from the code. Confirm them against the route table in the
production build log.

**Data cache.** Each query in `lib/public-queries.ts` is wrapped in `unstable_cache` for
60 seconds, with the tags `categories` and `products`. Only public catalogue data is cached:
the same for every visitor, with nothing private in it. Nothing from the cart, checkout or
orders is cached.

**Fresh data after a change.** When an admin approves, rejects or deletes a product or a
seller, or moves a product to another category, the admin route calls
`revalidatePath("/", "layout")` (`lib/admin/revalidate.ts`), so these pages are rebuilt on
the next visit and don't wait for the 60 seconds to run out.

**Retry.** The cloud database sometimes drops the first connection after being idle. Each
query is tried once more after 0.8 s before it fails (`withRetry`).

**Page titles.** Product details uses `generateMetadata` to show the product name in the tab
("Desk Lamp | StartupSpark"), or "Product Not Found | StartupSpark".

### 3. Loading, error and empty states

| | Where | What it does |
|---|---|---|
| Loading | Home: `<Suspense>` skeletons; `app/categories/(list)/loading.tsx` | Grey blocks shaped like the category tiles and product cards appear first. The Categories skeleton is kept inside a route group so that it doesn't apply to Category details (see Not found). |
| Loading (filters) | `MarketplaceClient` | "Loading products..." while new filter results load. |
| Error | Home sections | Each section fails on its own ("Couldn't load categories right now…"); the rest of the page still shows. |
| Error | Marketplace filters | "We couldn't load the products. Please check your connection and try again." with a **Try again** button. |
| Error | Search results | "Unable to load search results. Please try again later." |
| Error | `app/error.tsx` | "Something went wrong" with **Try again** and a link home. The real error is only logged. |
| Not found | `notFound()` in Category details and Product details | Unknown categories and unknown, unapproved or hidden products show the 404 page, with a real HTTP 404 status. |
| Empty | each list | e.g. "No trending products yet…", "No products match your filters.", "No products matched "x"…", "No approved products in this category yet.", "Your cart is feeling light". |
| Form errors | Checkout | Missing fields, an empty cart and server errors (out of stock, too many orders) are shown in a `role="alert"` message above the button. The button says "Placing order..." while it waits. |

### 4. Performance

- **Server data, no extra round trip:** catalogue data is in the first HTML response.
- **Streaming:** the Home page's two data sections stream in separately, so the hero image
  (the largest element) doesn't wait for the database.
- **`next/image`:** the Home hero loads with `priority` and `sizes="100vw"`. Product card
  images are resized to their display size and lazy-loaded. The first Product details image
  loads with `priority`, and thumbnails are 64 px. Cart thumbnails are 64 px.
- **Parallel queries:** the Marketplace loads categories and products together, and the list
  and its count run together (`Promise.all`).
- **`lucide-react`** icons are imported one by one, so only the icons used are bundled.

### 5. Tests

Two test files (50 tests) run against a real PostgreSQL database:

- `tests/public-pages.test.ts` (29 tests): Home categories and Trending; the Marketplace's
  first page; the products API's visibility, category, price, search, sort and paging, and 400
  for bad input; Search results (no term, case-insensitive matches, no results, term too
  long); Categories and Category details (counts, empty states, 404 for an unknown slug);
  Product details (props, page title, 404 for unknown / unapproved / hidden-seller products);
  the product API never returns admin notes, the seller's email or password.
- `tests/cart-checkout.test.ts` (21 tests): the Cart page groups items by business with the
  right subtotals and checkout links; the Checkout page shows only that business's items
  and total, with labelled required fields; `POST /api/orders` takes prices from the database,
  reserves stock and notifies the seller, rolls back when stock runs out, refuses products
  from another business or unapproved products, validates every field, and returns 429 after
  10 orders an hour; the order confirmation needs the buyer's token.

Run them with `npx vitest run tests/public-pages.test.ts tests/cart-checkout.test.ts`.

### 6. Lighthouse (mobile, production URL)

Reports: `docs/lighthouse/shehani/`. Target: Performance ≥ 80 and LCP < 2.5 s.

| Page | Perf before | Perf after | LCP before | LCP after |
|---|---|---|---|---|
| Home | | | | |
| Marketplace | | | | |
| Search results | | | | |
| Categories | | | | |
| Category details | | | | |
| Product details | | | | |
| Shopping Cart | | | | |
| Checkout | | | | |

_To fill in: the scores from the production reports. If no report was taken before the
changes went live, write "not measured" in the "before" columns instead of a number._

---

## Himasha: admin pages 35–42

_Template: Himasha to fill in. Use the same parts as the sections above._

| # | Page | Route |
|---|---|---|
| 35 | | |
| 36 | | |
| 37 | | |
| 38 | | |
| 39 | | |
| 40 | | |
| 41 | | |
| 42 | | |

### 1. Data fetching on the server

_How each page loaded its data before, and how it loads now (Server Component, data function,
which parts are still Client Components)._

### 2. Rendering and caching

_Static, dynamic or cached for each page, and why. How the pages show fresh data after a
change._

### 3. Loading, error and empty states

_What the visitor sees while the page loads, when something fails, and when there is no
data._

### 4. Performance

_Images, fonts, packages, database indexes and anything else changed for speed._

### 5. Tests

_Test files, how many tests, what they check, and how to run them._

### 6. Lighthouse (mobile, production URL)

Reports: `docs/lighthouse/himasha/`. Target: Performance ≥ 80 and LCP < 2.5 s.

| # | Page | Perf before | Perf after | LCP before | LCP after |
|---|---|---|---|---|---|
| 35 | | | | | |
| 36 | | | | | |
| 37 | | | | | |
| 38 | | | | | |
| 39 | | | | | |
| 40 | | | | | |
| 41 | | | | | |
| 42 | | | | | |

---

## Imesha's pages

_Template: Imesha to fill in. Use the same parts as the sections above._

| Page | Route |
|---|---|
| | |

### 1. Data fetching on the server

_How each page loaded its data before, and how it loads now (Server Component, data function,
which parts are still Client Components)._

### 2. Rendering and caching

_Static, dynamic or cached for each page, and why. How the pages show fresh data after a
change._

### 3. Loading, error and empty states

_What the visitor sees while the page loads, when something fails, and when there is no
data._

### 4. Performance

_Images, fonts, packages, database indexes and anything else changed for speed._

### 5. Tests

_Test files, how many tests, what they check, and how to run them._

### 6. Lighthouse (mobile, production URL)

Reports: `docs/lighthouse/imesha/`. Target: Performance ≥ 80 and LCP < 2.5 s.

| Page | Perf before | Perf after | LCP before | LCP after |
|---|---|---|---|---|
| | | | | |
