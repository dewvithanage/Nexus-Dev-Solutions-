import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// Handles entrepreneur registration.
// Creates a User (role = ENTREPRENEUR), an EntrepreneurProfile (status =
// PENDING until an admin approves it), and a starter Business record, all
// in one database transaction so we never end up with half-created data.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fullName,
      email,
      phone,
      businessName,
      whatsappNumber,
      password,
    } = body as {
      fullName?: string;
      email?: string;
      phone?: string;
      businessName?: string;
      whatsappNumber?: string;
      password?: string;
    };

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { message: "Full name, email and password are required." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        phone: phone || null,
        passwordHash,
        role: "ENTREPRENEUR",
        entrepreneurProfile: {
          create: {
            // Falls back to the phone number if a separate WhatsApp number
            // isn't collected on the registration form yet.
            whatsappNumber: whatsappNumber || phone || "",
            business: {
              create: {
                businessName: businessName || `${fullName}'s Business`,
              },
            },
          },
        },
      },
      include: {
        entrepreneurProfile: { include: { business: true } },
      },
    });

    return NextResponse.json(
      {
        message: "Registration successful. Your account is pending admin approval.",
        entrepreneur: {
          id: user.id,
          fullName: user.name,
          email: user.email,
          status: user.entrepreneurProfile?.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
