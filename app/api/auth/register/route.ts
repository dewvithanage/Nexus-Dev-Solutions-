import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { isValidEmailFormat, validatePassword } from "@/lib/validation";

// Handles entrepreneur registration.
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

    if (
      !fullName ||
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { message: "Full name, email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim();

    // Any real-looking email address is allowed now (client request) —
    // this only rejects obviously malformed input like "asdf".
    if (!isValidEmailFormat(normalizedEmail)) {
      return NextResponse.json(
        { message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    // Case-insensitive, so "Test@Gmail.com" can't register as a second
    // account next to "test@gmail.com". Now that any email is allowed,
    // this matters much more than it did with the FHSS-only pattern.
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });

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
        email: normalizedEmail,
        phone: phone || null,
        passwordHash,
        role: "ENTREPRENEUR",

        entrepreneurProfile: {
          create: {
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
        entrepreneurProfile: {
          include: {
            business: true,
          },
        },
      },
    });

    // Notify every admin that a new registration needs review — this is
    // what populates the "Registrations" tab on Admin Notifications.
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "REGISTRATION",
          title: "New Entrepreneur Registration",
          message: `${fullName} (${
            businessName || "unnamed business"
          }) has applied and needs review.`,
          relatedEntityType: "EntrepreneurProfile",
          relatedEntityId: user.entrepreneurProfile?.id,
        })),
      });
    }

    return NextResponse.json(
      {
        message:
          "Registration successful. Your account is pending admin approval.",

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
