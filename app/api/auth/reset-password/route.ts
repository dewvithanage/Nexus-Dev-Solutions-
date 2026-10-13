import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, parseJsonBody } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/schemas";
import { hashResetToken } from "@/lib/reset-token";

const INVALID_LINK = "This reset link is invalid or has expired. Please request a new one.";

export async function POST(request: NextRequest) {
  try {
    // Same password rules as registration (8-72 characters, at least one
    // letter and one number). Without this, a reset link was a way around
    // them: any 6-character password was accepted here.
    const parsed = await parseJsonBody(request, resetPasswordSchema);
    if (parsed.error) return parsed.error;

    const { token, newPassword } = parsed.data;

    // The database only holds the hash of the token (lib/reset-token.ts).
    const tokenHash = hashResetToken(token);
    const user = await prisma.user.findUnique({
      where: { resetToken: tokenHash },
      select: { id: true, resetTokenExpiry: true },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return jsonError(INVALID_LINK, 400);
    }

    const passwordHash = await hashPassword(newPassword);

    // The token is cleared in the same update, so a link works only once.
    // Matching on the token as well as the id means two requests racing
    // with the same link cannot both succeed.
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, resetToken: tokenHash },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    if (count === 0) {
      return jsonError(INVALID_LINK, 400);
    }

    return NextResponse.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
