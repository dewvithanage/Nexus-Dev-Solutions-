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
    // Apply the same stronger password policy as registration so reset
    // cannot bypass validation.
    const parsed = await parseJsonBody(request, resetPasswordSchema);
    if (parsed.error) return parsed.error;
    const { token, newPassword } = parsed.data;

    const tokenHash = hashResetToken(token);
    const invalidLink = () => NextResponse.json(
      { code: "INVALID_RESET_LINK", message: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );

    // Reject invalid links before doing expensive password hashing.
    const user = await prisma.user.findFirst({
      where: { resetToken: tokenHash, resetTokenExpiry: { gt: new Date() } },
      select: { id: true },
    });
    if (!user) return invalidLink();

    const passwordHash = await hashPassword(newPassword);

    // Match and consume the token in one database operation. Concurrent
    // requests, replaced links, or links expiring during hashing cannot win twice.
    const updated = await prisma.user.updateMany({
      where: { id: user.id, resetToken: tokenHash, resetTokenExpiry: { gt: new Date() } },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        sessionVersion: { increment: 1 },
      },
    });
    if (updated.count !== 1) return invalidLink();

    return NextResponse.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
