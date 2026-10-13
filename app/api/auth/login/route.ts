import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/request-validation";

// Only email and password are accepted; any other field is a 400. The email
// format isn't checked here: a malformed email simply won't match an account.
const loginSchema = z
  .object({
    email: z
      .string({ required_error: "Email and password are required." })
      .trim()
      .min(1, "Email and password are required.")
      .max(254, "Email is too long."),
    password: z
      .string({ required_error: "Email and password are required." })
      .min(1, "Email and password are required.")
      .max(200, "Password is too long."),
  })
  .strict();

// Handles entrepreneur login.
// On success, sets an httpOnly cookie containing a signed session token.
// The browser cannot read this cookie with JavaScript, which is safer than
// storing login info in localStorage.
//
// Brute-force protection: after 5 failed attempts for the same email within
// 10 minutes, that email is locked for 5 minutes (same limiter as admin login).
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, loginSchema);
    if (parsed.error) return parsed.error;
    const { email, password } = parsed.data;

    // The prefix keeps this counter separate from the admin login's, and the
    // lower-casing means "A@x.com" and "a@x.com" share one counter.
    const rateLimitKey = `entrepreneur-login:${email.toLowerCase()}`;

    // Checked BEFORE looking the user up, so a locked email gets the same
    // answer whether or not an account exists for it.
    const lockout = await isLockedOut(rateLimitKey);
    if (lockout.locked) {
      return NextResponse.json(
        {
          message: `Too many failed login attempts. Please try again in ${lockout.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(lockout.retryAfterSeconds ?? 300) },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      // The hash is hidden from every other query (lib/prisma.ts); login is
      // the one place that needs it.
      omit: { passwordHash: false, sessionVersion: false },
      include: { entrepreneurProfile: { include: { business: true } } },
    });

    // An unknown email counts as a failed attempt too. If only real accounts
    // were counted, an attacker could tell which emails are registered by
    // seeing which ones eventually lock.
    if (!user || user.role !== "ENTREPRENEUR") {
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

    // A successful login wipes the failed-attempt counter.
    await clearAttempts(rateLimitKey);

    // Checked only after the password, so this doesn't reveal an account's
    // status to someone who doesn't know its password. Pending accounts may
    // sign in to see their status; they just can't sell until approved.
    if (user.entrepreneurProfile?.status === "REJECTED") {
      return NextResponse.json(
        { message: "Your application was not approved, so you can't sign in. Contact the Startup Spark team if you think this is a mistake." },
        { status: 403 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      role: "ENTREPRENEUR",
      sessionVersion: user.sessionVersion,
    });

    const response = NextResponse.json(
      {
        message: "Login successful.",
        entrepreneur: {
          id: user.id,
          fullName: user.name,
          email: user.email,
          businessName: user.entrepreneurProfile?.business?.businessName ?? null,
          status: user.entrepreneurProfile?.status,
        },
      },
      { status: 200 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
