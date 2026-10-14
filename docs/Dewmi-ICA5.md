# Dewmi ICA 5 verification

Scope: WhatsApp confirmation, reviews, About, public Gallery, entrepreneur registration, login, forgot/reset password, and entrepreneur dashboard. Admin page source is outside this change.

## Implementation

- PostgreSQL data is accessed through Prisma; schema and database constraints are committed in `prisma/schema.prisma` and `prisma/migrations`.
- Login uses bcrypt and an HTTP-only session cookie. Protected dashboard pages and the statistics API check the current database session, role, approval status, and session version.
- The dashboard loads real statistics on the server and refreshes through `GET /api/entrepreneurs/dashboard-stats`. Both use the same query service. Private statistics are never cached and injected query fields are rejected.
- Registration accepts a strict server schema; the account, profile, business and registration notifications save in one transaction.
- Password reset tokens are hashed, expire, and are consumed atomically, including concurrent requests. Reset links are never returned by the forgot-password API. A password reset invalidates existing sessions.
- Guest order confirmation requires the correct private order token. Its page confirms the database save and asks the buyer to send the WhatsApp message; opening WhatsApp is not proof of message delivery.
- Reviews use strict validation and a transaction for the review and rating summary. Hidden products cannot be reviewed. About and Gallery read database content and display failures explicitly.

## Verification

Run `npm test` for the security suite. The default runner creates a disposable PostgreSQL database and applies committed migrations. Never set `TEST_DATABASE_URL` to a live database.

Run `npx tsc --noEmit --incremental false` and `npm run lint` for code checks.

Automated tests cover login, persisted registration, registration rollback, password reset token expiry/reuse/concurrency, dashboard access and seller isolation, guest order-token access, review validation/persistence, and About/Gallery database data.

## Submission and external checks

These notes describe technical behavior, not individual contribution ownership. Use your own GitHub PR and review records to demonstrate work you actually implemented.

The guide requires the assessed Develop branch. This checkout uses `Dev` as its development branch and changes are being prepared on `Dewmi`; verify the expected branch name with the course team and merge through the required PR workflow.

Run the browser flow on the configured deployment: sign in, complete a task, reload and verify persistence, then test unauthorized access. Include the LMS verification code in the client demo.

README documents a previous secret exposure in Git history. Removing the file does not erase that exposure. The deployment owner must confirm that database credentials, JWT signing keys and previously seeded account passwords were rotated; local code inspection cannot verify deployed values.

## Results from this update

- Full isolated-database suite: 210 tests passed across 19 test files.
- TypeScript check passed. Repository lint has no errors and existing warnings outside the scoped fixes.
- Repository-wide dependency hardening was investigated separately. Package manifest/lockfile changes are excluded from this scoped page commit; do not treat these notes as a claim that the repository is vulnerability-free.
- A later local production build passed with dummy process credentials and warnings, before the ICA 6 rendering refactor. That local build is not production evidence. Browser/deployment flow verification remains outstanding.
- Historic secret details and verification limits are recorded in `docs/security/README.md`.
