#!/usr/bin/env bash
# Pulls the latest code on the Droplet and restarts the site.
# Run on the server:  bash /var/www/startupspark/deploy/redeploy.sh
set -euo pipefail

cd /var/www/startupspark
git pull --ff-only
npm ci
npx prisma migrate deploy   # applies new migrations to the database in .env
npm run build
pm2 reload startupspark
echo "Deployed $(git log --oneline -1)"
