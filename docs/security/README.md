# Historic secret exposure and verification

The repository's main README documents a historic exposure in commit `4ca8492`: `migrations/app/refs/db.json` contained a local database connection credential and a JWT signing secret. The file was subsequently removed, but its contents remain accessible in Git history. Earlier seeded account passwords are also documented in the main README as exposed.

This code review confirmed that the historic file is still present in Git history. Current local `DATABASE_URL` and `JWT_SECRET` values were compared without printing them and were not found in that historic file. This check does not prove that every historical secret was rotated, that deployed environments use new values, or that account passwords were changed.

The deployment/database owner must confirm rotation of exposed credentials and signing keys in every affected environment and replacement of exposed seed passwords. Never paste secrets into this document or into GitHub. Preserve the factual incident explanation required by the assessment guide.

Current code reads secrets from environment variables, ignores local environment files in Git, hides user secret columns from normal Prisma queries, and sends password reset links only through email. These controls do not erase the historic incident or its assessment implications.
