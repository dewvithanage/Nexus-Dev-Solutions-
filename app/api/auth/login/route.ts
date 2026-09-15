import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Handles entrepreneur login.
// On success, sets an httpOnly cookie containing a signed session token.
// The browser cannot read this cookie with JavaScript, which is safer than
// storing login info in localStorage.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { entrepreneurProfile: { include: { business: true } } },
    });

    if (!user || user.role !== "ENTREPRENEUR") {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordIsCorrect = await verifyPassword(password, user.passwordHash);

    if (!passwordIsCorrect) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      role: "ENTREPRENEUR",
    });

    const response = NextResponse.json(
      {
        message: "Login successful.",
        entrepreneur: {
          id: user.id,
          fullName: user.name,
          email: user.email,
          businessName: user.entrepreneurProfile?.business?.businessName ?? null,
          status: user.entrepreneurProfile?.status,
        },
      },
      { status: 200 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
