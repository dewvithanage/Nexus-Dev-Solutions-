import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

// Generates a password reset token valid for 1 hour, and tries to email it
// to the user via Gmail (see lib/email.ts). If EMAIL_USER/EMAIL_APP_PASSWORD
// aren't set up yet (e.g. a teammate hasn't configured their .env), this
// falls back to returning the link directly in the response so the app
// still works end-to-end during development.


import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";


export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as {
      email?: string;
    };

    if (!email) {
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

        message:
          "If that email is registered, a reset link has been sent to it.",

        sentViaEmail: true,
        resetLink: null,
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    const oneHourFromNow = new Date(
      Date.now() + 60 * 60 * 1000
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: oneHourFromNow,
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const resetLink =
      `${appUrl}/entrepreneur/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(
        user.email,
        resetLink
      );

      return NextResponse.json({
        message:
          "A password reset link has been sent to your email.",
        sentViaEmail: true,
        resetLink: null,
      });
    } catch (emailError) {
      console.warn(
        "Email sending failed:",
        emailError
      );

      return NextResponse.json({
        message:
          "Email could not be sent. Showing the reset link for development.",
        sentViaEmail: false,
        resetLink,
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