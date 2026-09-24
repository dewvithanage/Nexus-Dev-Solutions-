// A simple in-memory rate limiter to slow down brute-force password
// guessing against admin accounts — the highest-value target in this
// system. Tracks failed attempts per email and temporarily locks out
// further attempts after too many failures in a short window.
//
// LIMITATION (documented, not an oversight): this is in-memory, so it
// resets if the server restarts, and won't work correctly across
// multiple server instances (each instance has its own memory). For a
// real production deployment with multiple servers, this should be
// swapped for a shared store (e.g. Redis). For this project's scale —
// a single server — this genuinely stops the naive "just try 1000
// passwords in a loop" attack, which is the realistic threat here.

type AttemptRecord = { count: number; firstAttemptAt: number; lockedUntil: number | null };

const attempts = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

export function isLockedOut(key: string): { locked: boolean; retryAfterSeconds?: number } {
  const record = attempts.get(key);
  if (!record || !record.lockedUntil) return { locked: false };

  const now = Date.now();
  if (now < record.lockedUntil) {
    return { locked: true, retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // Lockout period has passed — clear the record so they get a fresh start.
  attempts.delete(key);
  return { locked: false };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    // First failure, or the previous window has expired — start counting fresh.
    attempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: null });
    return;
  }

  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
  attempts.set(key, record);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
