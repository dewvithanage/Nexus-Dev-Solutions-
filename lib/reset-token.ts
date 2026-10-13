import crypto from "crypto";

// Password reset tokens. Kept out of lib/auth.ts because that file is also
// loaded by middleware.ts, which runs on the Edge runtime where Node's
// "crypto" module is not available.

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// 32 random bytes as hex. This plain value only ever goes into the emailed
// link.
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// What gets stored in User.resetToken is the SHA-256 hash of the token,
// never the token itself, so someone who can read the database (or a leaked
// backup) still cannot use it to reset a password. A fast hash is fine
// because the token is random, not a guessable password.
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
