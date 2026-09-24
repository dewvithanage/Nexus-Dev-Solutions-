import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
<<<<<<< HEAD

// Generates a password reset token valid for 1 hour.
//
// NOTE for the team: this does not send a real email (no email service is
// set up for this student project). Instead it returns the reset link
// directly in the API response, and the frontend displays it on screen.
// This is a deliberate simplification — see the architecture doc, section
// "Summary of Open Decisions" — swap this for real email sending if your
// lecturer requires it.
=======
import { sendPasswordResetEmail } from "@/lib/email";

// Generates a password reset token valid for 1 hour, and tries to email it
// to the user via Gmail (see lib/email.ts). If EMAIL_USER/EMAIL_APP_PASSWORD
// aren't set up yet (e.g. a teammate hasn't configured their .env), this
// falls back to returning the link directly in the response so the app
// still works end-to-end during development.
>>>>>>> origin/Dev
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
<<<<<<< HEAD
        message: "If that email is registered, a reset link has been generated.",
=======
        message: "If that email is registered, a reset link has been sent to it.",
        sentViaEmail: true,
>>>>>>> origin/Dev
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

<<<<<<< HEAD
    return NextResponse.json({
      message: "Reset link generated.",
      resetLink,
    });
=======
    try {
      await sendPasswordResetEmail(user.email, resetLink);
      // Real email sent successfully — don't leak the link in the API
      // response, since it would defeat the purpose of emailing it.
      return NextResponse.json({
        message: "A password reset link has been sent to your email.",
        sentViaEmail: true,
        resetLink: null,
      });
    } catch (emailError) {
      // Email isn't configured yet on this machine, or sending failed —
      // fall back to showing the link on screen so development isn't
      // blocked. Logs the real reason on the server for debugging.
      console.warn("Email sending failed, falling back to on-screen link:", emailError);
      return NextResponse.json({
        message: "Email isn't configured on this server yet — showing the reset link directly instead:",
        sentViaEmail: false,
        resetLink,
      });
    }
>>>>>>> origin/Dev
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
