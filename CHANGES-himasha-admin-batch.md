# Himasha's pages — all 8 built, plus critical prerequisites bundled in

## Important — this zip includes Oshadhi's admin foundation too

None of Himasha's pages can work without being able to log in as admin
first — but Oshadhi's Admin Login, Admin Dashboard, `AdminSidebar`, and
the `/api/admin/*` security fix haven't been merged into `dev` yet. So
this zip includes those essential pieces bundled in, the same way
Shehani needed About/Gallery bundled in earlier. **This may cause file
conflicts if applied to a branch that already has Oshadhi's admin work
— if so, keep whichever version is newer/already-merged for the shared
files (middleware.ts, AdminSidebar.tsx, admin login) and only take the
genuinely new files from this zip.**

## Real database change

`Category` gained a `description` field (needed for Category
Management). Run:
```
npx prisma db push
```
(Using `db push` rather than `migrate dev` — safer given the ongoing
migration-history mismatches between branches; see earlier notes in
this conversation for why.)

## What's in this zip — the 8 pages

| Page | Route |
|---|---|
| Sales Verification | `/admin/sales` |
| Sales Confirmation Details (Transaction Audit) | `/admin/sales/[orderId]` |
| Entrepreneur Rankings | `/admin/rankings` |
| Reports & Analytics | `/admin/reports` |
| Category Management | `/admin/categories` |
| Content Management | `/admin/content` |
| Admin Notifications | `/admin/notifications` |
| Admin Gallery Management | `/admin/gallery` |

Plus 2 files updated to notify admins of new activity:
- `app/api/auth/register/route.ts` — notifies all admins when a new
  entrepreneur registers
- `app/api/products/route.ts` — notifies all admins when a new product
  is submitted

And `lib/validation.ts` was updated to the client's actual requirement
(only `ar#####@fhss.sjp.ac.lk` emails, not any `sjp.ac.lk` address) — an
older, broader version had been floating around from earlier testing.

## Simplifications, matching the established pattern for this project

1. **Category Management is flat, not a tree** — the Figma shows nested
   sub-categories, but our schema only supports one flat category per
   product. Building a real parent/child category system would need a
   schema change beyond what's asked for — flagged for the team if
   sub-categories are genuinely needed later.
2. **Content Management moderates reviews, not a review/dispute
   distinction** — the Figma's table for this page actually reused the
   Rankings page's columns (looks like a copy-paste mistake in the
   original design), but the page's own heading and the "Review
   Details" panel make the real intent obvious: moderate customer
   reviews. Built accordingly.
3. **No PDF export on Reports & Analytics** — the Figma shows "Download
   PDF" buttons for a Monthly Sales Audit and Entrepreneur Directory
   Summary; generating real PDF reports is a substantial feature on its
   own and wasn't in the written requirements — left out for now.
4. **No dispute/reporting system** — Admin Notifications' "Disputes"
   tab from the Figma isn't included, since there's no underlying
   Report/Dispute model in the schema. The two tabs that exist
   (Registrations, Product Alerts) are real and functional.
5. **Escrow fee line omitted from Transaction Audit** — the Figma shows
   a "Platform Escrow Fee" line item; our Order model doesn't track a
   separate platform fee, only the order total — so the breakdown shows
   product line items and the real total only.

## How to apply

1. Unzip and copy into the project. Say "Replace" if asked — but see
   the warning at the top about files that may already exist from
   Oshadhi's merged work.
2. Run: `npx prisma db push`
3. Run: `npm run seed` (adds the admin account if it's not already there)
4. `npm run dev`, then test:
   - Log in at `/admin/login` (`admin@startupspark.lk` / `Admin@1234`)
   - `/admin/sales` — should show orders once an entrepreneur has
     uploaded a sales confirmation (Imesha's Upload Sales Confirmation
     page creates these)
   - Click into one, try "Confirm & Release" and "Flag Irregularity"
   - `/admin/rankings` — try the This Week / This Month / All Time filters
   - `/admin/reports` — check the stat cards and the two simple charts
   - `/admin/categories` — add a new category, edit one, try deleting
     one that has no products
   - `/admin/content` — should list any reviews submitted so far, try
     viewing and removing one
   - `/admin/gallery` — upload an image, confirm it appears on the
     public `/gallery` page too
   - `/admin/notifications` — register a new test entrepreneur or
     submit a new product, then check a notification appears here
