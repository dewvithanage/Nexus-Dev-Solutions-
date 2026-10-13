import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { z } from "zod";
import { emailField, parseJsonBody } from "@/lib/request-validation";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/lib/rate-limit";

// This is almost identical to /api/auth/login (entrepreneur login), but
// kept as its OWN separate route because:
//   1. The 42-page plan lists "Admin Login" as its own screen, separate
//      from "Entrepreneur Login" — they're different user journeys.
//   2. It checks role === "ADMIN" instead of "ENTREPRENEUR", and doesn't
//      need to load a business/entrepreneurProfile at all.
// Both routes end up setting the exact same session cookie, so
// middleware.ts can protect /admin/* and /entrepreneur/* the same way
// once someone is logged in, regardless of which login route they used.
//
// SECURITY: admin accounts are the highest-value target in this system,
// so this route specifically adds two things the entrepreneur login
// didn't need as urgently: real email format validation (not just
// "is it non-empty"), and rate limiting on repeated failed attempts
// (see lib/rate-limit.ts) to slow down password-guessing attacks.
const adminLoginSchema = z
  .object({
    email: emailField,
    password: z
      .string({ required_error: "Email and password are required." })
      .min(1, "Email and password are required.")
      .max(200, "Password is too long."),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    // Strict schema: a real email format, a bounded password, and nothing else.
    const parsed = await parseJsonBody(request, adminLoginSchema);
    if (parsed.error) return parsed.error;
    const { email, password } = parsed.data;

    // Rate limit by email, not IP — this specifically stops "try many
    // passwords against one admin account," which is the realistic
    // threat for a system with only one or two known admin emails.
    const rateLimitKey = email.toLowerCase().trim();
    const lockStatus = await isLockedOut(rateLimitKey);
    if (lockStatus.locked) {
      return NextResponse.json(
        {
          message: `Too many failed login attempts. Please try again in ${lockStatus.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      // Login is the one place that needs the hash (hidden elsewhere, see lib/prisma.ts).
      omit: { passwordHash: false, sessionVersion: false },
    });

    // Same error message whether the email doesn't exist OR the account
    // isn't an admin — this avoids telling a stranger "that email exists
    // but isn't an admin", which would leak information.
    if (!user || user.role !== "ADMIN") {
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordIsCorrect = await verifyPassword(password, user.passwordHash);

    if (!passwordIsCorrect) {
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Successful login — clear any prior failed attempts for this email
    // so a legitimate admin isn't left partway toward a lockout from
    // earlier typos.
    await clearAttempts(rateLimitKey);

    const token = await createSessionToken({
      userId: user.id,
      role: "ADMIN",
      sessionVersion: user.sessionVersion,
    });

    const response = NextResponse.json(
      {
        message: "Login successful.",
        admin: { id: user.id, name: user.name, email: user.email },
      },
      { status: 200 }
    );

    // Same cookie name/settings as entrepreneur login, so the rest of the
    // app (middleware, getCurrentUser) doesn't need to know which login
    // page was used.
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
