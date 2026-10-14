import { afterAll, inject, vi } from "vitest";

// Runs in each test worker before the test file is imported.

// Point Prisma at the test database before anything imports lib/prisma.
process.env.DATABASE_URL = inject("databaseUrl");
// lib/auth.ts refuses to load without a secret. This one only signs test
// sessions and is not used anywhere else.
process.env.JWT_SECRET = "test-only-jwt-secret-not-used-anywhere-else";

// Route Handlers read the session cookie through next/headers, which only
// works inside a real Next.js request. Tests set the cookie with
// signInAs()/signOut() in tests/helpers.ts instead.
const cookieJar = new Map<string, string>();
(globalThis as { __testCookieJar?: Map<string, string> }).__testCookieJar = cookieJar;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

afterAll(async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
});
