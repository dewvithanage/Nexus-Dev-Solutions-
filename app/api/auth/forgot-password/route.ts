import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

// Generates a password reset token valid for 1 hour, and emails the link to
// the user via Gmail (see lib/email.ts).
//
// SECURITY: the reset link must only ever reach the person who owns the
// email address. If sending fails, the link is shown on screen ONLY when
// the app is running in development mode (npm run dev). In any other mode
// the response is the same generic message as for an unknown email -
// otherwise anyone could type another person's email (including the admin's)
// and get a working reset link back.
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as {
      email?: string;
    };

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        message: "If that email is registered, a reset link has been sent to it.",
        sentViaEmail: true,
        resetLink: null,
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: oneHourFromNow,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const resetLink = `${appUrl}/entrepreneur/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);

      return NextResponse.json({
        message: "A password reset link has been sent to your email.",
        sentViaEmail: true,
        resetLink: null,
      });
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
      return NextResponse.json({
        message: "If that email is registered, a reset link has been sent to it.",
        sentViaEmail: true,
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
