# Startup Spark — API Route Classification

Every endpoint is classified as one of:

- **Public** — anyone may call it, no sign-in needed.
- **Authenticated** — any signed-in user.
- **Authorised** — signed in **and** allowed by a rule (stated in one sentence).

Identity and role always come from the **server-side session cookie**, never from the request body, query string or a browser-set header.

Customers are guests by design (no customer accounts), so customer-facing routes are Public.

Every endpoint that takes input validates it on the server with Zod (`lib/request-validation.ts`), including query strings. Body schemas are strict: a request with a field the endpoint doesn't expect (such as `role`, `status` or `uploadedById`) is rejected with 400. Status codes: 400 invalid input, 401 not signed in, 403 signed in but not allowed, 404 not found, 409 duplicate.

---

## Auth

| Method | Endpoint | Class | Rule |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Anyone may apply; creates an entrepreneur account in `PENDING` state. Any valid email is accepted; password must be 8–72 characters with a letter and a number. |
| POST | `/api/auth/login` | Public | Anyone may attempt a login; only accounts with role `ENTREPRENEUR` succeed; failures return one generic 401; a rejected entrepreneur gets 403; 5 failed attempts per email locks that email for 5 minutes (stored in the database). |
| POST | `/api/auth/admin-login` | Public | Anyone may attempt; only role `ADMIN` succeeds; 5 failed attempts per email locks that email for 5 minutes. |
| POST | `/api/auth/logout` | Public | Ends the caller's sessions everywhere (copied cookies stop working) and clears the cookie. |
| GET | `/api/auth/me` | Authenticated | Returns only the signed-in user's own identity. |
| POST | `/api/auth/forgot-password` | Public | Anyone may request a reset for an email address; the reset link is only ever delivered by email (shown on screen only when running in development mode), and the response never reveals whether the email is registered. |
| POST | `/api/auth/reset-password` | Public | Succeeds only with a valid, unexpired reset token; the token works once. |

## Public marketplace (guest customers)

| Method | Endpoint | Class | Rule |
|---|---|---|---|
| GET | `/api/categories` | Public | Lists categories with a count of publicly visible products. |
| GET | `/api/gallery` | Public | Lists gallery images. |
| GET | `/api/marketplace/products` | Public | Lists only publicly visible products: `APPROVED` products of `APPROVED` entrepreneurs (search, filter, sort, pagination). |
| GET | `/api/products/[productId]` | Public | Returns one publicly visible product; seller exposed as display name only; never admin notes. |
| GET | `/api/businesses/[businessId]` | Public | Public storefront, shown only if the entrepreneur is `APPROVED`: business details and its approved products. |
| GET | `/api/reviews/product/[productId]` | Public | Lists reviews for a publicly visible product. |
| POST | `/api/reviews` | Public | A guest may review a publicly visible product (whole-number 1–5 rating); 5 reviews per hour per visitor. |
| POST | `/api/orders` | Public | A guest may order publicly visible products; prices come from the database; stock is checked and reserved; 10 orders per hour per visitor. Returns a secret access token for the confirmation page. |
| GET | `/api/orders/[orderId]` | Public (token) | Only with the order's secret access token (`?token=`), given to the buyer at checkout; otherwise 404. |

## Entrepreneur (authenticated, owner-only)

Routes marked **approved** also require an admin-approved registration (pending or rejected accounts get 403). Someone else's record returns 404.

| Method | Endpoint | Class | Rule |
|---|---|---|---|
| GET, PATCH | `/api/entrepreneurs/me` | Authorised | Only the signed-in entrepreneur may read or edit their own profile and business. |
| POST | `/api/entrepreneurs/me/logo` | Authorised | Only the signed-in entrepreneur may change their own business logo. |
| GET, POST | `/api/products` | Authorised | List own products; creating one is **approved** only and always starts `PENDING` in the caller's own business. |
| GET, PATCH | `/api/products/mine/[productId]` | Authorised | Only the owner may read it; editing is **approved** only and sends it back to `PENDING`; price ≥ 0 with 2 decimals, stock a whole number ≥ 0. |
| POST | `/api/products/[productId]/images` | Authorised | **Approved** owner only; up to 4 real JPG/PNG/WebP images per product. |
| GET | `/api/orders/mine` | Authorised | Only the signed-in entrepreneur may list orders belonging to their own business. |
| POST | `/api/orders/[orderId]/confirmation` | Authorised | **Approved** owner of the order only; once per order, only while it is open (409 otherwise). |
| GET, PATCH | `/api/notifications` | Authorised | A signed-in user may read and mark read only their own notifications. |
| PATCH | `/api/notifications/[id]` | Authorised | Only the owner of a notification may mark it read. |

## Admin (role `ADMIN` only)

Rule for every row below: **only a signed-in user with role `ADMIN` may call it; anyone else gets 401 or 403.**

| Method | Endpoint | What it does |
|---|---|---|
| GET, POST | `/api/admin/categories` | List / create categories. |
| PATCH, DELETE | `/api/admin/categories/[id]` | Rename (slug follows the name) / delete a category (409 while products still use it). |
| GET | `/api/admin/entrepreneurs` | List entrepreneur accounts (paginated; filter by tab or exact `status`). |
| GET, DELETE | `/api/admin/entrepreneurs/[id]` | View / permanently delete an entrepreneur (refused if any of their products has order history). |
| PATCH | `/api/admin/entrepreneurs/[id]/approve` | Approve a registration and notify the entrepreneur (409 if already approved). |
| PATCH | `/api/admin/entrepreneurs/[id]/reject` | Reject a registration with an optional reason, notify the entrepreneur and end their sessions (409 if already rejected). |
| GET, POST | `/api/admin/gallery` | List / upload gallery images. The uploader is taken from the session; only real JPG/PNG/WebP files up to 5 MB are accepted. |
| DELETE | `/api/admin/gallery/[id]` | Remove a gallery image. |
| GET | `/api/admin/products` | List products (paginated, filtered). |
| GET, PATCH, DELETE | `/api/admin/products/[id]` | View / change category / permanently delete a product (refused if it has order history). |
| PATCH | `/api/admin/products/[id]/approve` | Approve a product and notify the entrepreneur (409 if already approved or the seller isn't approved). |
| PATCH | `/api/admin/products/[id]/reject` | Reject a product with a reason and notify the entrepreneur. |
| PATCH | `/api/admin/products/[id]/notes` | Save private admin notes on a product. |
| GET | `/api/admin/rankings` | Entrepreneur rankings by verified revenue. |
| GET | `/api/admin/reports` | Platform-wide statistics for Reports & Analytics. |
| GET | `/api/admin/reports/monthly-sales-audit` | Download the Monthly Sales Audit PDF. |
| GET | `/api/admin/reports/entrepreneur-directory` | Download the Entrepreneur Directory PDF. |
| GET | `/api/admin/reviews` | List all reviews for moderation. |
| DELETE | `/api/admin/reviews/[id]` | Remove a review. |
| GET | `/api/admin/sales` | List orders for verification. |
| GET | `/api/admin/sales/[orderId]` | Full order and payment-proof details. |
| PATCH | `/api/admin/sales/[orderId]/verify` | Confirm & release a sale; only with uploaded proof and while `PENDING_VERIFICATION` (409 otherwise). |
| PATCH | `/api/admin/sales/[orderId]/flag` | Flag an irregularity on a sale that has proof (409 otherwise). |

---

## Session mechanism

Login sets a signed token in an **httpOnly** cookie (not readable by browser JavaScript), valid for 7 days. Passwords are stored only as bcrypt hashes. The token is verified on the server for every protected request via `getCurrentUser()`, which also checks the user's `sessionVersion`: logout, a password reset or rejection increases it, which ends every earlier session.
