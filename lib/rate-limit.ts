import { prisma } from "./prisma";

// Slows down brute-force password guessing on the login routes. Tracks
// failed attempts per email and locks that email for a while after too many
// failures in a short window.
//
// The counts are stored in the LoginAttempt table rather than in server
// memory, so a lockout survives a server restart and is shared by every
// server instance.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function isLockedOut(
  key: string
): Promise<{ locked: boolean; retryAfterSeconds?: number }> {
  const record = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!record || !record.lockedUntil) return { locked: false };

  const now = Date.now();
  const lockedUntil = record.lockedUntil.getTime();
  if (now < lockedUntil) {
    return { locked: true, retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000) };
  }

  // Lockout period has passed — clear the record so they get a fresh start.
  await clearAttempts(key);
  return { locked: false };
}

export async function recordFailedAttempt(key: string): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const record = await tx.loginAttempt.findUnique({ where: { key } });

    if (!record || now.getTime() - record.firstAttemptAt.getTime() > WINDOW_MS) {
      // First failure, or the previous window has expired — start counting fresh.
      await tx.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1, firstAttemptAt: now },
        update: { count: 1, firstAttemptAt: now, lockedUntil: null },
      });
      return;
    }

    const count = record.count + 1;
    await tx.loginAttempt.update({
      where: { key },
      data: {
        count,
        lockedUntil: count >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MS) : null,
      },
    });
  });
}

// General-purpose limit for public forms (orders, reviews): allows `max`
// actions per key within `windowMs`, then refuses until the window ends.
// Uses the same table as the login lockout.
export async function consumeRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const record = await tx.loginAttempt.findUnique({ where: { key } });

    if (!record || now.getTime() - record.firstAttemptAt.getTime() > windowMs) {
      await tx.loginAttempt.upsert({
        where: { key },
        create: { key, count: 1, firstAttemptAt: now },
        update: { count: 1, firstAttemptAt: now, lockedUntil: null },
      });
      return { allowed: true };
    }

    if (record.count >= max) {
      const retryAfterMs = record.firstAttemptAt.getTime() + windowMs - now.getTime();
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }

    await tx.loginAttempt.update({ where: { key }, data: { count: record.count + 1 } });
    return { allowed: true };
  });
}

export async function clearAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
