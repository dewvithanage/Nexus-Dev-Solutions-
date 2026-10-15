# Admin pages 35–42: server data, rendering, loading states and performance

Owner: Himasha. Pages: Sales Verification (35), Sales Confirmation Details (36),
Entrepreneur Rankings (37), Reports & Analytics (38), Category Management (39),
Content Management (40), Admin Notifications (41), Admin Gallery Management (42).

## 1. Server data fetching

**Before:** every page was a Client Component (`"use client"`). The browser
downloaded an empty page, ran the JavaScript, and only then called
`/api/admin/...` to get the data. Admins saw "Loading..." first and the data
one extra round trip later.

**Now:** every `page.tsx` is an async Server Component. It:

1. checks the admin session on the server (`requireAdminPage()` in
   `lib/admin/page-auth.ts`). Middleware alone can't tell that a cookie was
   revoked by logout, so a signed-out cookie is redirected to `/admin/login`;
2. reads `?page=`, `?status=` and `?period=` with the same Zod schemas as the API
   routes. A bad value falls back to the default instead of breaking the page;
3. loads the data straight from the database through `lib/admin/*.ts`;
4. passes plain, serialisable data (numbers, ISO date strings) to a Client
   Component in `components/admin/<page>/`. That component handles the parts
   that need the browser: search box, tabs, pagination, buttons and dialogs.

The browser makes **no** `/api` request to show a page. The data is in the first
HTML response.

The API routes (`/api/admin/sales`, `/rankings`, `/reports`, `/categories`,
`/reviews`, `/gallery`, `/api/notifications`) now call the same `lib/admin`
functions as the pages. Each query exists once, and the existing API security
tests still cover it.

| Page | Data function |
|---|---|
| Sales Verification | `getSalesList` (`lib/admin/sales.ts`) |
| Sales Confirmation Details | `getSaleDetails` (`lib/admin/sales.ts`) |
| Entrepreneur Rankings | `getRankings` (`lib/admin/rankings.ts`) |
| Reports & Analytics | `getReportSummary` (`lib/admin/reports.ts`) |
| Category Management | `getCategoriesList` (`lib/admin/content.ts`) |
| Content Management | `getReviewsList` (`lib/admin/content.ts`) |
| Admin Notifications | `getNotificationsFor(sessionUserId)` (`lib/admin/content.ts`) |
| Admin Gallery Management | `getGalleryList` (`lib/admin/content.ts`) |

## 2. Rendering and caching

`next build` now lists all eight pages as `ƒ (Dynamic)`. Before, seven of them
were `○ (Static)`: prebuilt empty shells that loaded their data in the browser.

| Page | Rendering | Caching | Why |
|---|---|---|---|
| Sales Verification | Dynamic, per request | None | Private buyer/seller data that admins act on; must be current. |
| Sales Confirmation Details | Dynamic, per request | None | Buyer details and payment proof; the status decides whether Verify/Flag is allowed. |
| Entrepreneur Rankings | Dynamic (session check) | Totals in the Data Cache, tag `admin-sales-totals`, at most 60 s | Same totals for every admin, so no need to recompute on every view. |
| Reports & Analytics | Dynamic (session check) | Totals in the Data Cache, tag `admin-sales-totals`, at most 60 s | Platform-wide sums over every order. Expensive and the same for every admin. |
| Category Management | Dynamic, per request | None | Admins add and delete here; product counts decide whether delete is allowed. |
| Content Management | Dynamic, per request | None | Guests post reviews at any time; admins remove them here. |
| Admin Notifications | Dynamic, per request | None | Private to the signed-in admin; new ones arrive at any time. |
| Admin Gallery Management | Dynamic, per request | None | Admins upload and remove images here. |

Nothing private is cached per user. The cached Reports/Rankings data contains
no per-user information, and the admin check runs on **every** request
before the cache is read.

### Data is fresh after a change

- **Verify / Flag a sale** calls `revalidateTag("admin-sales-totals")`, so
  Reports and Rankings show the change on the very next request. This was
  checked on a production build: the platform revenue went up by exactly the
  verified sale's amount on the next page load. Changes made elsewhere (for
  example a new guest order in "Platform Sales Count") show within 60 seconds.
- **Add / delete category, remove review, upload / remove image, verify /
  flag**: after the API call succeeds, the page calls `router.refresh()`. This
  re-renders it on the server, so the list on screen is what is in the
  database. It also refreshes after a 404 or 409, when someone else changed
  the item first, so the page shows the real state.
- **Mark notification(s) as read** updates the screen straight away. If saving
  fails, it shows a message and reloads the real state from the server.
- Tabs, period and page number are in the URL (`?status=VERIFIED&page=2`).
  Changing them fetches fresh data from the server. Links can be shared, and
  Back/Forward work.

## 3. Loading and error states

| State | What the admin sees | Where |
|---|---|---|
| Opening a page / moving between admin pages | Sidebar and header straight away, plus a grey placeholder shaped like the page (table, stat cards, detail or list + panel). Screen readers hear "Loading ...". | `app/admin/<page>/loading.tsx` → `components/admin/AdminPageSkeleton.tsx` |
| Changing tab, period or page | The current content fades and "Updating..." shows until the new data arrives. | `useQueryNavigation()` (`isPending`) |
| Saving (add, delete, verify, flag, upload) | The button shows "Adding..." / "Deleting..." / "Saving..." and is disabled. | Each view component |
| Server rejects a change (e.g. duplicate category, order already decided) | The server's message, shown inline (not a browser `alert`). | Each view component |
| Network failure while saving | "Couldn't reach the server. Check your connection and try again." | Each view component |
| Data can't be loaded (e.g. database down) | Sidebar still works, plus "We couldn't load this page" with a **Try again** button and a reference code. The real error is only logged on the server. | `app/admin/<page>/error.tsx` → `components/admin/AdminPageError.tsx` |
| Unknown order id | "Order not found" with a link back to Sales Verification. | `app/admin/sales/[orderId]/not-found.tsx` |
| Empty lists / no search matches | A message saying so (e.g. "No verified sales in this period yet."). | Each view component |

Dates are formatted with a fixed locale and time zone (`lib/format-date.ts`,
Asia/Colombo). The server HTML and the browser's first render then match, so
there are no hydration warnings.

## 4. Performance: measured improvement

### Result

On a production build with realistic data, **every admin page now shows its
data 40–68% sooner**:

- On a desktop connection: **372 ms → 187 ms on average**.
- On a slow connection: **1,164 ms → 643 ms on average**.
- No page makes a `/api` request to show its data any more (1 → 0).

Desktop profile (40 ms round trip, 10 Mbps; Lighthouse desktop):

| Page | Before: data visible | After: data visible | Faster by |
|---|---|---|---|
| Sales Verification | 344 ms | 190 ms | 154 ms (45%) |
| Sales Confirmation Details | 341 ms | 190 ms | 151 ms (44%) |
| Entrepreneur Rankings | 318 ms | 192 ms | 126 ms (40%) |
| Reports & Analytics | 597 ms | 190 ms | 407 ms (68%) |
| Category Management | 317 ms | 183 ms | 134 ms (42%) |
| Content Management | 350 ms | 175 ms | 175 ms (50%) |
| Admin Notifications | 377 ms | 204 ms | 173 ms (46%) |
| Admin Gallery Management | 332 ms | 174 ms | 158 ms (48%) |

Slow profile (150 ms round trip, 1.6 Mbps, CPU 4× slower; Lighthouse mobile):

| Page | Before: data visible | After: data visible | Faster by |
|---|---|---|---|
| Sales Verification | 1,196 ms | 618 ms | 578 ms (48%) |
| Sales Confirmation Details | 1,105 ms | 585 ms | 520 ms (47%) |
| Entrepreneur Rankings | 1,050 ms | 628 ms | 422 ms (40%) |
| Reports & Analytics | 1,349 ms | 735 ms | 614 ms (46%) |
| Category Management | 976 ms | 558 ms | 418 ms (43%) |
| Content Management | 1,035 ms | 627 ms | 408 ms (39%) |
| Admin Notifications | 1,444 ms | 763 ms | 681 ms (47%) |
| Admin Gallery Management | 1,155 ms | 627 ms | 528 ms (46%) |

First Contentful Paint is about the same before and after. Before, the first
paint was an empty "Loading..." page. Now the first paint is the real data.

### Reports query (server side)

`/api/admin/reports` used to load every order, and every category with all of
its products, order items and orders, then add them up in JavaScript. It now
asks the database for the sums (`aggregate`, `count`, and one `GROUP BY` for
revenue by category), and the result is cached.

| `/api/admin/reports` (median) | Time |
|---|---|
| Before | 225 ms |
| After, first request after a change (not cached) | 27 ms |
| After, cached | 8 ms |

### How this was measured

- **Builds:** `next build` + `next start` (production mode) of the code before
  this change (commit `d7b63bd`) and after it. Both ran side by side against
  the same database.
- **Data:** a local PostgreSQL seeded with 300 entrepreneurs, 600 products,
  3,000 orders over six months, 2,000 reviews, 60 gallery images and 100
  admin notifications. The live Neon database was not used.
- **Browser:** headless Chrome via `puppeteer-core`, signed in as an admin,
  with network and CPU throttling set through the Chrome DevTools Protocol.
- **Metric:** "data visible" is the time from starting the navigation until
  the page's real data is on screen, checked on every animation frame from
  the start of the page load. Before and after loads alternate, with one
  warm-up and then 7 measured loads per page and profile. Medians are
  reported.

### Measuring the production website

`scripts/measure-admin-pages.mjs` takes the same measurements on any
deployment and does not change any data. Run it on the live site before
deploying this change and again after:

```bash
npm i --no-save puppeteer-core
ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/measure-admin-pages.mjs https://<production-site> before
# deploy, then:
ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/measure-admin-pages.mjs https://<production-site> after
```

Each run prints a table and saves `perf-<label>.json`. On the production
build above, this script gave the same results as the side-by-side
comparison (for example Reports, desktop: 609 ms → 207 ms).

## 5. Tests

- `tests/admin-pages.test.ts` (34 tests): every page redirects visitors,
  entrepreneurs and logged-out sessions to `/admin/login`. Pages render the real
  data on the server, and private fields such as the guest order token are
  never sent. Bad URL values fall back to defaults, and an unknown order shows
  not-found. Verify/Flag clear the Reports/Rankings cache, and a refused verify
  doesn't.
- The existing API security tests (`tests/admin-*.test.ts`) still pass
  against the shared `lib/admin` functions.
- Checked in a real browser on the production build:
  - all 8 pages render with no console errors or hydration warnings
  - tabs and pagination update the URL and the data
  - Verify re-renders the saved status
  - adding and deleting a category updates the list, and a duplicate name
    shows the server's message
  - the loading skeleton appears when moving between pages on a slow
    connection
  - with the database down, the error page with "Try again" appears
