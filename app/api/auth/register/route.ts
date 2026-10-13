import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { isUniqueViolation, jsonError, parseJsonBody } from "@/lib/api";
import { registerSchema } from "@/lib/schemas";

// Handles entrepreneur registration.
export async function POST(request: NextRequest) {
  try {
    // Validates every field on the server (lib/schemas.ts) and rejects any
    // field the form does not send, so nobody can register with e.g.
    // "role": "ADMIN" or "status": "APPROVED". The email is trimmed and
    // lower-cased, and the password must pass the shared password rules.
    const parsed = await parseJsonBody(request, registerSchema);
    if (parsed.error) return parsed.error;

    const { fullName, email, phone, businessName, whatsappNumber, password } = parsed.data;

    // Case-insensitive, so "Test@Gmail.com" can't register as a second
    // account next to "test@gmail.com". Also catches older accounts that
    // were stored before emails were lower-cased.
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError("An account with this email already exists.", 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        phone: phone ?? null,
        passwordHash,
        role: "ENTREPRENEUR",

        entrepreneurProfile: {
          create: {
            whatsappNumber: whatsappNumber ?? phone ?? "",

            business: {
              create: {
                businessName: businessName ?? `${fullName}'s Business`,
              },
            },
          },
        },
      },

      include: {
        entrepreneurProfile: true,
      },
    });

    // Notify every admin that a new registration needs review — this is
    // what populates the "Registrations" tab on Admin Notifications.
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
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
    // Two identical registrations at the same moment can both pass the
    // check above; the database's unique email constraint stops the second.
    if (isUniqueViolation(error)) {
      return jsonError("An account with this email already exists.", 409);
    }

    console.error("Registration error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
