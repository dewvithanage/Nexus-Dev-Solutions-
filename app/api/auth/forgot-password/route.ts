import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Generates a password reset token valid for 1 hour.
//
// NOTE for the team: this does not send a real email (no email service is
// set up for this student project). Instead it returns the reset link
// directly in the API response, and the frontend displays it on screen.
// This is a deliberate simplification — see the architecture doc, section
// "Summary of Open Decisions" — swap this for real email sending if your
// lecturer requires it.
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond the same way whether or not the email exists, so
    // nobody can use this form to check which emails are registered.
    if (!user) {
      return NextResponse.json({
        message: "If that email is registered, a reset link has been generated.",
        resetLink: null,
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: oneHourFromNow },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/entrepreneur/reset-password?token=${token}`;

    return NextResponse.json({
      message: "Reset link generated.",
      resetLink,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
