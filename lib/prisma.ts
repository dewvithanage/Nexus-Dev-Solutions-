import { PrismaClient } from "@prisma/client";

// Next.js reloads files often in development. Without this, every reload
// would create a brand new PrismaClient and eventually exhaust database
// connections. We store one instance on the global object and reuse it.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
