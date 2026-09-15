import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// jose is used instead of the older "jsonwebtoken" package because jose
// works inside Next.js Middleware (the Edge runtime), which we need for
// route protection in middleware.ts.

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set. Add it to your .env file.");
}

const secretKey = new TextEncoder().encode(JWT_SECRET);

export type SessionPayload = {
  userId: string;
  role: "ENTREPRENEUR" | "ADMIN";
};

// Hash a plain text password before saving it to the database.
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

// Compare a plain text password against the stored hash.
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

// Create a signed session token containing the user's id and role.
// This token is what we store in the httpOnly cookie.
export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

// Verify a session token and return its payload, or null if invalid/expired.
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
