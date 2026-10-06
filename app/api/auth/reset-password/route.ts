import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = (await request.json()) as {
      token?: string;
      newPassword?: string;
    };

    if (
      !token ||
      !newPassword ||
      typeof token !== "string" ||
      typeof newPassword !== "string"
    ) {
      return NextResponse.json(
        { message: "Reset token and new password are required." },
        { status: 400 }
      );
    }

    // Same password rules as registration (8-72 characters, at least one
    // letter and one number). Without this, a reset link was a way around
    // them: any 6-character password was accepted here.
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { resetToken: token } });

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
      },
    });

    return NextResponse.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
