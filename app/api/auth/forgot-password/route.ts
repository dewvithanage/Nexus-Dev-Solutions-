import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, verifyPasswordResetEmailService } from "@/lib/email";
import { parseJsonBody } from "@/lib/request-validation";
import { RESET_TOKEN_TTL_MS, generateResetToken, hashResetToken } from "@/lib/reset-token";

// The email format isn't checked: an unknown or malformed email gets the
// same generic answer, so nothing reveals which emails are registered.
const forgotPasswordSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required." })
      .trim()
      .min(1, "Email is required.")
      .max(254, "Email is too long."),
  })
  .strict();

// Generates a password reset token valid for 1 hour, and emails the link to
// the user via Gmail (see lib/email.ts).
//
// Reset links only reach the account owner by email. Every API response is
// generic and never includes a usable token, including in development.
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, forgotPasswordSchema);
    if (parsed.error) return parsed.error;
    const { email } = parsed.data;

    try {
      await verifyPasswordResetEmailService();
    } catch (error) {
      // Log diagnostics, never SMTP credentials, recipient addresses or reset links.
      const smtp = error as { code?: string; responseCode?: number };
      console.warn("Password reset email service unavailable", { code: smtp.code, responseCode: smtp.responseCode });
      return NextResponse.json(
        { message: "Password reset email is temporarily unavailable. Please try again later.", resetLink: null },
        { status: 503, headers: { "Retry-After": "60" } }
      );
    }

    // Case-insensitive: emails are stored as typed at registration, so
    // "Nimal@Gmail.com" must also be found as "nimal@gmail.com".
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({
        message: "If this email belongs to a registered account, you will receive a password reset link.",
        resetLink: null,
      });
    }

    const token = generateResetToken();

    // Only the SHA-256 hash of the token is stored (lib/reset-token.ts), so
    // someone who can read the database cannot use it to reset a password.
    // A new request replaces the old token, so older links stop working.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashResetToken(token),
        resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const resetUrl = new URL("/entrepreneur/reset-password", appUrl);
    resetUrl.searchParams.set("token", token);
    const resetLink = resetUrl.toString();

    try {
      await sendPasswordResetEmail(user.email, resetLink);

      // Word for word the same reply as for an unknown email, so the answer
      // never reveals whether an account exists.
      return NextResponse.json({
        message: "If this email belongs to a registered account, you will receive a password reset link.",
        resetLink: null,
      });
    } catch (emailError) {
      const smtp = emailError as { code?: string; responseCode?: number };
      console.warn("Password reset email delivery failed", { code: smtp.code, responseCode: smtp.responseCode });
      // Remove only this undelivered token; never erase a newer request's token.
      await prisma.user.updateMany({
        where: { id: user.id, resetToken: hashResetToken(token) },
        data: { resetToken: null, resetTokenExpiry: null },
      });

      // Never disclose a reset token in an API response, including development.
      // Anywhere else: say nothing that reveals the link, or whether the
      // email is registered.
      return NextResponse.json({
        message: "If this email belongs to a registered account, you will receive a password reset link.",
        resetLink: null,
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
