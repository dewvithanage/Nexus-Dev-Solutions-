# Startup Spark — API Route Classification

Every endpoint is classified as one of:

- **Public** — anyone may call it, no sign-in needed.
- **Authenticated** — any signed-in user.
- **Authorised** — signed in **and** allowed by a rule (stated in one sentence).

Identity and role always come from the **server-side session cookie**, never from the request body, query string or a browser-set header.

Customers are guests by design (no customer accounts), so customer-facing routes are Public.

---

## Auth

| Method | Endpoint | Class | Rule |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Anyone may apply; creates an entrepreneur account in `PENDING` state. Any valid email is accepted; password must be 8–72 characters with a letter and a number. |
| POST | `/api/auth/login` | Public | Anyone may attempt a login; only accounts with role `ENTREPRENEUR` succeed; failures return one generic 401. |
| POST | `/api/auth/admin-login` | Public | Anyone may attempt; only role `ADMIN` succeeds; 5 failed attempts per email locks that email for 5 minutes. |
| POST | `/api/auth/logout` | Public | Clears the caller's own session cookie. |
| GET | `/api/auth/me` | Authenticated | Returns only the signed-in user's own identity. |
| POST | `/api/auth/forgot-password` | Public | Anyone may request a reset for an email address; the reset link is only ever delivered by email (shown on screen only when running in development mode), and the response never reveals whether the email is registered. |
| POST | `/api/auth/reset-password` | Public | Succeeds only with a valid, unexpired reset token. |

## Public marketplace (guest customers)

| Method | Endpoint | Class | Rule |
|---|---|---|---|
| GET | `/api/categories` | Public | Lists categories. |
| GET | `/api/gallery` | Public | Lists gallery images. |
| GET | `/api/marketplace/products` | Public | Lists only `APPROVED` products (search, filter, sort, pagination). |
| GET | `/api/products/[productId]` | Public | Returns one product only if it is `APPROVED`; seller exposed as display name only. |
| GET | `/api/businesses/[businessId]` | Public | Public storefront, shown only if the entrepreneur is `APPROVED`: business details and its approved products. |
| GET | `/api/reviews/product/[productId]` | Public | Lists reviews for a product. |
| POST | `/api/reviews` | Public | A guest may submit a review for a product. |
| POST | `/api/orders` | Public | A guest may place an order; prices are looked up server-side, never trusted from the browser. |
| GET | `/api/orders/[orderId]` | Public | A guest may read an order's confirmation details by its unguessable order ID. |

## Entrepreneur (authenticated, owner-only)

| Method | Endpoint | Class | Rule |
|---|---|---|---|
| GET, PATCH | `/api/entrepreneurs/me` | Authorised | Only the signed-in entrepreneur may read or edit their own profile and business. |
| POST | `/api/entrepreneurs/me/logo` | Authorised | Only the signed-in entrepreneur may change their own business logo. |
| GET, POST | `/api/products` | Authorised | Only a signed-in entrepreneur may create a product (starts `PENDING`) or list their own products. |
| GET, PATCH | `/api/products/mine/[productId]` | Authorised | Only the entrepreneur who owns the product may read or edit it; an edit sends it back to `PENDING`; price must be > 0 and stock a whole number ≥ 0. |
| POST | `/api/products/[productId]/images` | Authorised | Only the entrepreneur who owns the product may attach images to it. |
| GET | `/api/orders/mine` | Authorised | Only the signed-in entrepreneur may list orders belonging to their own business. |
| POST | `/api/orders/[orderId]/confirmation` | Authorised | Only the entrepreneur whose business owns the order may submit payment proof for it. |
| GET, PATCH | `/api/notifications` | Authorised | A signed-in user may read and mark read only their own notifications. |
| PATCH | `/api/notifications/[id]` | Authorised | Only the owner of a notification may mark it read. |

## Admin (role `ADMIN` only)

Rule for every row below: **only a signed-in user with role `ADMIN` may call it; anyone else gets 401 or 403.**

| Method | Endpoint | What it does |
|---|---|---|
| GET, POST | `/api/admin/categories` | List / create categories. |
| PATCH, DELETE | `/api/admin/categories/[id]` | Rename / delete a category (refused while products still use it). |
| GET | `/api/admin/entrepreneurs` | List entrepreneur accounts (paginated, filtered). |
| GET, DELETE | `/api/admin/entrepreneurs/[id]` | View / permanently delete an entrepreneur (refused if any of their products has order history). |
| PATCH | `/api/admin/entrepreneurs/[id]/approve` | Approve a registration and notify the entrepreneur. |
| PATCH | `/api/admin/entrepreneurs/[id]/reject` | Reject a registration with a reason and notify the entrepreneur. |
| GET, POST | `/api/admin/gallery` | List / upload gallery images. |
| DELETE | `/api/admin/gallery/[id]` | Remove a gallery image. |
| GET | `/api/admin/products` | List products (paginated, filtered). |
| GET, PATCH, DELETE | `/api/admin/products/[id]` | View / change category / permanently delete a product (refused if it has order history). |
| PATCH | `/api/admin/products/[id]/approve` | Approve a product and notify the entrepreneur. |
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
| PATCH | `/api/admin/sales/[orderId]/verify` | Confirm & release a sale. |
| PATCH | `/api/admin/sales/[orderId]/flag` | Flag an irregularity on a sale. |

---

## Session mechanism

Login sets a signed token in an **httpOnly** cookie (not readable by browser JavaScript), valid for 7 days. Passwords are stored only as bcrypt hashes. The token is verified on the server for every protected request via `getCurrentUser()`.
