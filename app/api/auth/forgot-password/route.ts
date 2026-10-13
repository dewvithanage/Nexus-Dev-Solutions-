import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { parseJsonBody } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/schemas";
import { RESET_TOKEN_TTL_MS, generateResetToken, hashResetToken } from "@/lib/reset-token";

// Generates a password reset token valid for 1 hour, and emails the link to
// the user via Gmail (see lib/email.ts).
//
// SECURITY: the reset link must only ever reach the person who owns the
// email address. If sending fails, the link is shown on screen ONLY when
// the app is running in development mode (npm run dev). In any other mode
// the response is the same generic message as for an unknown email -
// otherwise anyone could type another person's email (including the admin's)
// and get a working reset link back.
//
// The reply is also the same whether or not the email is registered, so
// this endpoint cannot be used to find out who has an account.
const GENERIC_REPLY = {
  message: "If that email is registered, a reset link has been sent to it.",
  sentViaEmail: true,
  resetLink: null,
};

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, forgotPasswordSchema);
    if (parsed.error) return parsed.error;

    const user = await prisma.user.findFirst({
      where: { email: { equals: parsed.data.email, mode: "insensitive" } },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(GENERIC_REPLY);
    }

    const token = generateResetToken();

    // Only the hash is stored (see lib/reset-token.ts). Requesting a new
    // link replaces the previous token, so older links stop working.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashResetToken(token),
        resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const resetLink = `${appUrl}/entrepreneur/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);

      return NextResponse.json(GENERIC_REPLY);
    } catch (emailError) {
      console.warn("Email sending failed:", emailError);

      // Development convenience only: lets a teammate without email set up
      // in their .env still test the reset flow end to end.
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          message: "Email could not be sent. Showing the reset link for development.",
          sentViaEmail: false,
          resetLink,
        });
      }

      // Anywhere else: say nothing that reveals the link, or whether the
      // email is registered.
      return NextResponse.json(GENERIC_REPLY);
    }
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
