import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { isUniversityEmail, UNIVERSITY_EMAIL_EXAMPLE } from "@/lib/validation";

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

    // Client requirement: only FHSS students can register right now.
    // Their emails look like ar118533@fhss.sjp.ac.lk — see lib/validation.ts
    // for the exact pattern and how to loosen this later for other faculties.
    if (!isUniversityEmail(email)) {
      return NextResponse.json(
        {
          message: `Please register with your FHSS university email (format: ${UNIVERSITY_EMAIL_EXAMPLE}).`,
        },
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

 Himasha
    // Notify every admin that a new registration needs review — this is
    // what populates the "Registrations" tab on Admin Notifications.
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "REGISTRATION",
          title: "New Entrepreneur Registration",
          message: `${fullName} (${businessName || "unnamed business"}) has applied and needs review.`,
          relatedEntityType: "EntrepreneurProfile",
          relatedEntityId: user.entrepreneurProfile?.id,
        })),
      });
    }

=======
 Dev
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
