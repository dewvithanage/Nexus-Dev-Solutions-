# Deploying StartupSpark to Vercel

The site runs on **Vercel** (free Hobby plan). The database stays on **Neon**, and
uploaded images (product images, logos, payment proofs, gallery) are stored in
**Vercel Blob**.

Why Blob: Vercel doesn't keep files written while the site runs. `lib/upload.ts` saves
to Blob whenever `BLOB_READ_WRITE_TOKEN` is set, and to `public/uploads` otherwise, so
local development and the tests don't change.

---

## 1. Create the project

The Hobby plan is free with no time limit. The "14-day trial" Vercel offers is for the
paid Pro plan; choose **Hobby** and don't start a team.

On Hobby, Vercel can only connect to repos owned by your own GitHub account. The team
repo belongs to **dewvithanage**, so the site is deployed from **Oshadhi's fork**:

1. On GitHub, open `dewvithanage/Nexus-Dev-Solutions-` → **Fork** → create the fork in
   your own account. Sign in at [vercel.com](https://vercel.com) with that GitHub account.
2. **Add New → Project** → import **your fork** of `Nexus-Dev-Solutions-`.
3. Framework: **Next.js** (detected). Leave the build settings as they are: `npm install`
   runs `prisma generate`, then `next build` runs.
4. **Production branch:** Settings → Git → set it to the branch you deploy from (`main`, or
   `Dev` if the team deploys from Dev). Other branches and PRs get preview URLs.
5. Don't deploy yet. Add the storage and environment variables first.

## 2. Add Blob storage

Project → **Storage** → **Create** → **Blob** → connect it to the project, for all
environments. This adds `BLOB_READ_WRITE_TOKEN` automatically.

## 3. Environment variables

Project → Settings → **Environment Variables** (Production, and Preview if you use previews):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon connection string. Use the **pooled** one (host contains `-pooler`): serverless functions open many short connections. |
| `JWT_SECRET` | The current, rotated secret |
| `EMAIL_USER` | Gmail address that sends emails |
| `EMAIL_APP_PASSWORD` | Its Gmail app password |
| `NEXT_PUBLIC_APP_URL` | The site's real address (Vercel → Domains), with `https://` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional: Google Analytics ID (`G-…`), see "Visitor statistics" below |
| `BLOB_READ_WRITE_TOKEN` | Added by step 2, nothing to type |

Never commit these values or paste them into chats, issues or screenshots.

## 4. Choose the function region

Project → Settings → **Functions** → **Function Region**: pick the region **nearest the
Neon database** (Neon dashboard → project → region), e.g. Singapore (`sin1`) for Neon
`ap-southeast-1`. Every page queries the database, so this matters for speed and
Lighthouse LCP.

## 5. Database migrations

Vercel does **not** run migrations. Before the first deploy, and after any merge that
adds a migration, run this from your own computer (with the Neon **direct** connection
string in your local `.env`):

```bash
npx prisma migrate deploy
```

Don't run `prisma migrate dev`, `db push` or the seed against Neon. The admin account
already exists there.

## 6. Deploy

Click **Deploy**.

**Updating the site:** after a PR is merged into the team repo, open the fork on GitHub
and click **Sync fork** → **Update branch**. Vercel redeploys automatically.

**No fork? Deploy from a laptop instead:** `npm i -g vercel`, `vercel login`,
`vercel link`, then `vercel --prod` from an up-to-date checkout. Steps 2–5 still apply
(set them in the Vercel dashboard). Nothing redeploys automatically: run `vercel --prod`
after each merge.

## 7. Check the deployment

- [ ] The site opens on its `https://….vercel.app` address.
- [ ] `/admin/login` signs in and **stays signed in** after a refresh.
- [ ] An entrepreneur can register; the admin sees it in Registration Approval.
- [ ] Add a product with images. They upload (one at a time) and show in the
      marketplace; their address starts with `https://…public.blob.vercel-storage.com`.
- [ ] Upload a payment proof and a gallery image; they show on the admin pages.
- [ ] The approval email arrives.
- [ ] Admin → Reports: both PDF downloads open.

## 8. ICA 6 Lighthouse reports

Reports must come from the production URL (see `docs/lighthouse/README.md`):

1. Deploy the current code **before** merging the ICA 6 page changes, and take everyone's
   "before" reports.
2. Merge the ICA 6 PRs. Vercel redeploys; run `npx prisma migrate deploy` if they added
   migrations.
3. Take the "after" reports and record the scores in `ICA6.md`.

## Visitor statistics (Google Analytics)

The public pages can report visits to Google Analytics, so the client can see how many
people use the site. It is **off until configured**, and visitors are asked first: nothing
is loaded from Google until they click **Accept** on the cookie banner.

1. The **client** signs in at [analytics.google.com](https://analytics.google.com) with
   their Google account → **Start measuring** → create an account and a property
   (e.g. "StartupSpark", time zone Sri Lanka) → platform **Web** → enter the site address.
2. Copy the **Measurement ID** shown for the web stream (starts with `G-`).
3. In the same web stream: **Enhanced measurement** ⚙ → **Page views** → *Show advanced
   settings* → **untick "Page changes based on browser history events"** → Save. The site
   sends its own page views with search terms and private codes removed; this setting
   would otherwise send full page addresses as well.
4. In Vercel → Environment Variables, add `NEXT_PUBLIC_GA_MEASUREMENT_ID` = that ID
   (Production) → **Redeploy**. The value is built into the page, so a redeploy is needed.
5. To give someone else read access: Analytics → **Admin → Property access management →
   +** → their email → role **Viewer**.

What is and isn't measured:

- Only public pages (home, marketplace, categories, products, businesses, gallery, about,
  cart, privacy). Never the admin or entrepreneur portals, checkout, order confirmation
  or password reset pages.
- Page addresses without anything after `?`, so search terms and order codes are never sent.
- Visitors can change their choice on `/privacy`, which is linked from the banner and the
  footer.
- Numbers appear under **Reports → Realtime** within a minute and in the other reports
  within a day.

## Limits to know

- **Uploads:** at most 4 MB per image, because Vercel rejects request bodies over 4.5 MB.
  Product forms send each image in its own request, so four images are fine.
- **Uploaded files are public** to anyone who has the exact address. The addresses
  contain a random UUID that can't be guessed. This is the same as before, when they
  were in `public/uploads`.
- **Hobby plan:** for non-commercial projects; usage allowances (bandwidth, function time,
  Blob storage, image resizing) are far above what this project uses.
- **Old local uploads:** files in a developer's `public/uploads` aren't copied to Blob.
  Database rows pointing at `/uploads/...` show a broken image on Vercel; re-upload them.

## Troubleshooting

| Problem | Check |
|---|---|
| Build fails at Prisma | `postinstall` must run `prisma generate` (it's in `package.json`) |
| `Can't reach database server` / too many connections | `DATABASE_URL` is the Neon **pooled** string; Neon project not paused |
| Upload fails "too large" / 413 | Image over 4 MB |
| Upload fails with a server error | Blob store connected? `BLOB_READ_WRITE_TOKEN` present in this environment? |
| Images don't show | The address should be on `*.public.blob.vercel-storage.com`; `next.config.mjs` allows that host |
| PDF report fails | Vercel → Deployment → Functions logs |
| Emails not sent | `EMAIL_USER` / `EMAIL_APP_PASSWORD` set for Production |

Logs: Vercel → project → **Logs** (or a deployment → Functions).
