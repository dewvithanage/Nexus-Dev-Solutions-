# Deploying StartupSpark to DigitalOcean

The site runs on a **DigitalOcean Droplet** (an Ubuntu virtual server): Next.js runs under
`pm2`, with Nginx in front for HTTPS and uploaded files. The database stays on **Neon**.

We use a Droplet, not DigitalOcean App Platform or Vercel, because uploads (product images,
payment proofs, gallery pictures) are saved to `public/uploads` on the server's disk.
App Platform and Vercel delete files written while the site runs; a Droplet keeps them.

Files used by this guide:

- [`deploy/nginx.conf`](../deploy/nginx.conf): the Nginx site
- [`deploy/redeploy.sh`](../deploy/redeploy.sh): pull, build and restart after each merge

---

## 1. Create the Droplet

In the DigitalOcean dashboard → **Create → Droplets**:

| Setting | Choose |
|---|---|
| Image | Ubuntu 24.04 LTS |
| Plan | Basic, Regular, **2 GB RAM** (with 1 GB, `npm run build` runs out of memory) |
| Region | The one **nearest the Neon database** (Neon dashboard → project → region). For example, Singapore for Neon `ap-southeast-1`. Every page queries the database, so this matters for speed. |
| Authentication | SSH key |
| Backups | Recommended: uploaded files exist only on this server |

The GitHub Student Developer Pack includes DigitalOcean credit.

Copy the Droplet's **IP address** when it's created.

## 2. Choose an HTTPS address

In production the session cookie is `secure`, so **sign-in only works over HTTPS**.
HTTPS needs a domain name:

- **Free, no sign-up:** [sslip.io](https://sslip.io). For IP `1.2.3.4` the address is
  `1-2-3-4.sslip.io`. It already points at the IP and works with Let's Encrypt.
- **Or** a domain of your own (e.g. a free `.me` from the Student Pack), with an `A` record
  pointing at the Droplet's IP.

Below, replace `1-2-3-4.sslip.io` with your address.

## 3. Prepare the server

```bash
ssh root@YOUR_DROPLET_IP

apt update && apt upgrade -y

# Node.js 22 (the version CI uses), git, Nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx

# Keeps the app running and restarts it after crashes or reboots
npm install -g pm2

# Firewall: only SSH and web traffic
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## 4. Install the app

```bash
mkdir -p /var/www && cd /var/www
git clone -b Dev https://github.com/dewvithanage/Nexus-Dev-Solutions-.git startupspark
cd startupspark

nano .env
```

`.env` on the server (real values come from the team's private `.env`):

```
DATABASE_URL=postgresql://...        # Neon connection string
JWT_SECRET=...                       # the current, rotated secret
EMAIL_USER=...                       # Gmail address that sends emails
EMAIL_APP_PASSWORD=...               # its Gmail app password
NEXT_PUBLIC_APP_URL=https://1-2-3-4.sslip.io
```

```bash
chmod 600 .env                       # only root can read the secrets
```

**Never commit `.env`** or paste its values into chats, issues or screenshots.

Build and start:

```bash
npm ci
npx prisma migrate deploy            # applies pending migrations to Neon
npm run build

pm2 start npm --name startupspark -- start
pm2 save
pm2 startup                          # then run the command it prints
```

The app now listens on `127.0.0.1:3000`. Nginx is the only thing exposed to the internet.

Admin account: `prisma/seed.ts` creates it, and it already exists on the shared Neon
database. **Don't run the seed or `prisma migrate dev` / `db push` against Neon.**

## 5. Nginx and HTTPS

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/startupspark
nano /etc/nginx/sites-available/startupspark     # set server_name to your address

ln -s /etc/nginx/sites-available/startupspark /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Free HTTPS certificate from Let's Encrypt; renews automatically
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 1-2-3-4.sslip.io --redirect
```

What the Nginx config does:

- forwards requests to the app, and **overwrites** `X-Forwarded-For` with the real client
  address. Login rate limiting uses that header, so visitors must not be able to set it
  themselves;
- serves `/uploads/` straight from disk;
- allows uploads up to 10 MB at the proxy (the app's own limit is 5 MB).

## 6. Check the deployment

- [ ] `https://1-2-3-4.sslip.io` opens with a padlock; `http://` redirects to `https://`.
- [ ] `/admin/login` signs in **and stays signed in** after a refresh. If it doesn't, the
      site is being reached over plain HTTP.
- [ ] An entrepreneur can register; the admin sees it in Registration Approval.
- [ ] Upload a product image; it shows in the marketplace and on the admin pages.
- [ ] The approval email arrives (check the Gmail settings in `.env` if not).
- [ ] `pm2 status` shows `startupspark` as `online`.

## 7. Updating the site after a merge

```bash
ssh root@YOUR_DROPLET_IP
bash /var/www/startupspark/deploy/redeploy.sh
```

This pulls `Dev`, installs dependencies, applies new migrations, builds and reloads the app.

## 8. ICA 6 Lighthouse reports

Reports must come from this production URL (see [lighthouse/README.md](lighthouse/README.md)).

1. Deploy the current `Dev`, **before** merging the ICA 6 page changes. Take everyone's
   "before" reports.
2. Merge the ICA 6 PRs into `Dev` and run `deploy/redeploy.sh`.
3. Take the "after" reports and record the scores in `ICA6.md`.

## Troubleshooting

| Problem | Check |
|---|---|
| `502 Bad Gateway` | App not running: `pm2 status`, `pm2 logs startupspark --lines 50` |
| Build killed / "JavaScript heap out of memory" | Droplet has less than 2 GB RAM. Resize it, or add swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| Sign-in doesn't stick | Use the `https://` address; check certbot finished |
| `Can't reach database server` | `DATABASE_URL` in `.env`; Neon project not paused |
| Uploaded image doesn't show | `ls /var/www/startupspark/public/uploads`; Nginx `alias` path ends with `/` |
| Emails not sent | `EMAIL_USER` / `EMAIL_APP_PASSWORD`; Gmail needs an app password |

## Backups and costs

- Uploaded files exist **only on the Droplet**. Turn on Droplet backups, or copy them off now
  and then: `scp -r root@YOUR_DROPLET_IP:/var/www/startupspark/public/uploads ./uploads-backup`
- The database is backed up by Neon.
- A Droplet costs money (or credit) while it exists, even when switched off. Destroy it
  when the project no longer needs to be online.
