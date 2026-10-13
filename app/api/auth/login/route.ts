import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/api";
import { loginSchema } from "@/lib/schemas";

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

    const { password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    // The prefix keeps this counter separate from the admin login's, and the
    // lower-casing means "A@x.com" and "a@x.com" share one counter.
    const rateLimitKey = `entrepreneur-login:${email}`;

    // Checked BEFORE looking the user up, so a locked email gets the same
    // answer whether or not an account exists for it.
    const lockout = isLockedOut(rateLimitKey);
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

    // Case-insensitive, matching registration: an account registered as
    // "Test@Gmail.com" can sign in as "test@gmail.com".
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: { entrepreneurProfile: { include: { business: true } } },
    });

    // An unknown email counts as a failed attempt too. If only real accounts
    // were counted, an attacker could tell which emails are registered by
    // seeing which ones eventually lock.
    if (!user || user.role !== "ENTREPRENEUR") {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordIsCorrect = await verifyPassword(password, user.passwordHash);

    if (!passwordIsCorrect) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // A successful login wipes the failed-attempt counter.
    clearAttempts(rateLimitKey);

    const token = await createSessionToken({
      userId: user.id,
      role: "ENTREPRENEUR",
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
