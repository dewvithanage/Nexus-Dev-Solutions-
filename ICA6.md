# ICA 6 ? Dewmi's pages

Production URL: https://www.startupspark.shop/
Repository: https://github.com/dewvithanage/Nexus-Dev-Solutions-

This file describes Dewmi's scoped changes. It does not claim other members' development work or complete production evidence.

## Ownership

| Member | GitHub username | Owned features / routes |
| --- | --- | --- |
| Dewmi | dewvithanage | WhatsApp confirmation, reviews, About, Gallery, entrepreneur registration, login, forgot password, reset password and dashboard (routes below) |
| Other team members | Team to supply verified usernames | Team to supply each member's own routes; not inferred from branch names |

## Rendering decisions

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

## Data fetching and freshness

Initial Gallery, review-list, review-form product identity and guest order details now come directly from server data functions, without a browser `useEffect` fetch or server HTTP call to our own API. Gallery lists are limited to 24 images and reviews to 20 rows per page. Independent list/count or list/summary queries run in parallel. Queries select only the required fields.

A submitted review and its rating summary save together; `revalidatePath` invalidates the review routes, followed by client navigation and router refresh. Other owned database views intentionally have no persistent data cache, so each navigation reads current data. Personalized data has no shared cache.

Each owned route has a loading skeleton and retry boundary. Missing or unauthorized product/order records call `notFound()`; lists have explicit empty states. About and dashboard use Suspense to stream slower sections.

Images on the owned Gallery/About pages use `next/image`; the existing site font setup uses `next/font`. There are no heavy client-only libraries in the new form components that require a dynamic import. The query-index migration is `prisma/migrations/20261015090000_dewmi_page_query_indexes/migration.sql`; it was authored but has not been run.

## Production evidence ? pending completion

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

## Release requirements for the team

- Supply the remaining member/username/route ownership rows.
- The shared `/api/version` endpoint must return the deployed commit SHA. Implementing or changing shared release infrastructure is outside Dewmi's requested page scope.
- Another member must review and approve the PR into development; CI must pass. Release development into main through a reviewed PR.
- Tag the final approved commit `ica6`, deploy that exact commit, and verify `/api/version` matches the tag.
- Apply the committed migration through the team's approved deployment workflow, not against live data during these local changes.
- Run the production core flow, private-user isolation checks, mobile before/after Lighthouse and slow-network/error-state checks.

No migration, Git push, production deployment, or release tag was performed in this task.

## Baseline findings

Seven valid mobile production baselines were collected on 15 October 2026 in a headless private Edge session. Original JSON and HTML reports are saved, unchanged, under `docs/lighthouse/before-*.report.*`. These are the current deployed site's results, not the local changes' results.

Gallery's 64 Performance score and 5.65-second LCP miss both targets. This update removes its browser-only initial API fetch, renders image URLs in the server HTML, prioritizes the first image and limits/paginates the list. About and the three measured authentication pages meet the target; see the table for the two review pages. After deployment, repeat measurements under comparable conditions to determine whether performance actually improved.

Review baseline product: `/products/cmutt62c70001kr40aelhshyj` (Chocolate Cup Cake), an existing publicly listed product during measurement. No review was submitted.

Scoped verification: 13 isolated server-rendering/query tests passed, TypeScript passed, and the scoped lint check passed without warnings. These tests use mocked database calls and verify that gallery/review data is present in server HTML. Live database behavior and the unapplied indexes still require the approved deployment/CI workflow.
