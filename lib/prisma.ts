import { PrismaClient } from "@prisma/client";

// Next.js reloads files often in development. Without this, every reload
// would create a brand new PrismaClient and eventually exhaust database
// connections. We store one instance on the global object and reuse it.
//
// SECURITY: secret User columns are left out of EVERY query by default, so
// an `include: { user: true }` anywhere in the app can never send a password
// hash or reset token to the browser. Code that genuinely needs one (only
// the login routes) asks for it explicitly with `omit: { passwordHash: false }`.
function createPrismaClient() {
  return new PrismaClient({
    omit: {
      user: { passwordHash: true, resetToken: true, resetTokenExpiry: true, sessionVersion: true },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
