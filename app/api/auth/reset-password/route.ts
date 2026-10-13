import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { newPasswordField, parseJsonBody } from "@/lib/request-validation";
import { hashResetToken } from "@/lib/reset-token";

const resetPasswordSchema = z
  .object({
    // forgot-password issues tokens as 32 random bytes in hex.
    token: z
      .string({ required_error: "Reset token and new password are required." })
      .regex(/^[a-f0-9]{64}$/, "This reset link is invalid or has expired. Please request a new one."),
    newPassword: newPasswordField,
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    // The new password follows the same rules as registration (8-72
    // characters, at least one letter and one number). Without this, a reset
    // link was a way around them.
    const parsed = await parseJsonBody(request, resetPasswordSchema);
    if (parsed.error) return parsed.error;
    const { token, newPassword } = parsed.data;

    // The database holds only the hash of the token (lib/reset-token.ts).
    const user = await prisma.user.findUnique({
      where: { resetToken: hashResetToken(token) },
      omit: { resetTokenExpiry: false },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return NextResponse.json(
        { message: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        // A new password signs out every existing session, in case the
        // reset was needed because someone else had access.
        sessionVersion: { increment: 1 },
      },
    });

    return NextResponse.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
