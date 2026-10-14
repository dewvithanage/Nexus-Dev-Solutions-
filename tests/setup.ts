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

// The Next.js Data Cache only exists inside a running Next.js server.
// In tests, cached functions just run every time, and revalidation calls
// are recorded so tests can check that a change clears the right cache.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

afterAll(async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
});
