# StartupSpark — Web-Based Student Entrepreneur Marketplace Platform

StartupSpark is a centralized online marketplace built for the **Entrepreneurship
Development Unit, University of Sri Jayewardenepura**, connecting student
entrepreneurs with customers on campus. It replaces scattered social media
posts with one platform where students can showcase products and services,
customers can discover and contact them directly, and administrators can
manage the entire marketplace from a single dashboard.

## Client

**Organization:** Entrepreneurship Development Unit, University of Sri Jayewardenepura
**Client:** Mr. Chamika Balasuriya, Instructor

## The Problem

Student entrepreneurs at Startup Spark had no dedicated platform to promote
their products, forcing them to rely on scattered social media posts that
limited their reach. Meanwhile, program administrators had no centralized
way to manage registrations, approve listings, verify sales, or track
entrepreneur performance.

## Key Features

### For Customers (Guest — no account required)
- Browse and search products by category, price, and keyword, with pagination
- View detailed product pages with images, ratings, and reviews
- Add to cart and checkout, with orders confirmed via WhatsApp
- Leave ratings and reviews on products

### For Entrepreneurs
- Register with a university email, pending admin approval
- Manage a business profile and storefront
- Add, edit, and resubmit products (each requiring admin approval)
- Track order and sales history, with real-time revenue/escrow stats
- Upload payment confirmation proof for completed sales
- Receive notifications on registration status, product approval, and orders

### For Administrators
- Approve or reject entrepreneur registrations and product listings
- Verify submitted sales proof and manage disputes
- Rank entrepreneurs by verified sales performance
- Generate platform-wide reports and downloadable PDF summaries
- Manage categories, moderate reviews, and curate the public gallery
- Permanently remove entrepreneurs/products (with safeguards protecting
  historical order data)

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Neon)
- **Auth:** Session-based authentication with bcrypt password hashing
- **Tools:** Git, GitHub, Figma

## Team

| Name | Role |
|---|---|
| A.H.O.P.A. Dias | Team Leader / Project Manager |
| W.R.A. D. H. Jayasingha | Business Analyst |
| W.D.R.S. Withanage | Main Developer |
| A.G.I. Upayangi | QA Engineer |
| K.S.P.K. De Silva | UI/UX Engineer |

## Running the Tests

```bash
npm install
npm test
```

`npm test` runs the security tests in `tests/` against a **separate, throwaway
PostgreSQL database**, never the live one:

- By default it starts a private local Postgres server (via `embedded-postgres`)
  in a temp folder, builds the schema from `prisma/migrations`, runs the
  tests, then deletes it. Nothing needs to be installed or configured.
- To use another test database instead (e.g. a Neon test branch), set
  `TEST_DATABASE_URL`. The `DATABASE_URL` in `.env` is never used by tests.

Each protected endpoint is tested for: no session (401), wrong user or role
(403/404, with the database confirmed unchanged), extra or malicious fields
(400), and the rightful user (success, with the database change confirmed).
The same tests run automatically on GitHub for every push and pull request
(`.github/workflows/test.yml`), against a temporary Postgres container.

`tests/helpers.ts` has shared helpers (`signInAs`, `createAdmin`,
`createEntrepreneur`, `resetDatabase`, ...) for adding tests for more endpoints.

## Database Setup

The schema is in `prisma/schema.prisma` and the full database can be
recreated from `prisma/migrations`:

```bash
npx prisma migrate deploy   # apply migrations to DATABASE_URL
npm run seed                # optional demo data
```

CHECK constraints (e.g. non-negative prices and stock, ratings 1-5) are
defined in the migration SQL, since Prisma's schema language can't express
them.

## Security Notice: Secret Committed to Git History

**What happened.** Commit `4ca8492` (18 Sep 2026) accidentally added the file
`migrations/app/refs/db.json`, which contained:

- `DATABASE_URL` with the password of a developer's **local** PostgreSQL
  database (`localhost`), and
- a `JWT_SECRET` value, the key used to sign login session cookies.

The file was deleted in commit `ac8e63b` (5 Oct 2026), but deleting a file
does not remove it from Git history, so both values must be treated as
public.

**What was done.**

1. **`JWT_SECRET` rotated.** Anyone who knows the old value could forge a
   session cookie for any user, including an admin. Every environment
   (each developer's `.env` and the deployment) now uses a new, randomly
   generated secret, and the old value is not used anywhere. This also
   signed everyone out of existing sessions.
2. **Local database password changed.** The leaked password belonged to a
   local development database that was not reachable from the internet. It
   has been changed anyway, and was never used for the shared Neon
   database.
3. **Prevention.** All `.env*` files are listed in `.gitignore`, secrets are
   only read from environment variables (`process.env`), and the app refuses
   to start without `JWT_SECRET`. The only `NEXT_PUBLIC_` variable is the
   public site URL.

Generate a new secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
