import { inject, vi } from "vitest";

import { assertSafeTestDatabaseUrl } from "./db-safety";

// Runs in every test file before the file's own imports, so lib/prisma.ts
// connects to the test database and lib/auth.ts finds a JWT secret.
const databaseUrl = inject("databaseUrl");
assertSafeTestDatabaseUrl(databaseUrl);
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "test-only-jwt-secret-do-not-use-anywhere-else";

// Route Handlers read the session cookie with cookies() from next/headers,
// which only works inside a real Next.js request. Tests replace it with a
// cookie jar they control (tests/helpers.ts: signInAs / signOut). Everything
// after that - verifying the JWT and loading the user from the database -
// is the real code.
vi.mock("next/headers", async () => {
  const { getTestCookie } = await import("./session-cookie");
  return {
    cookies: async () => ({
      get: (name: string) => {
        const value = getTestCookie(name);
        return value === undefined ? undefined : { name, value };
      },
    }),
  };
});
