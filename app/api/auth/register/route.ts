import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { emailField, isPrismaError, newPasswordField, parseJsonBody } from "@/lib/request-validation";

// Optional text fields: an empty or blank string counts as "not given".
const optionalText = (max: number, label: string) =>
  z
    .string({ invalid_type_error: `${label} must be text.` })
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : undefined));

const phonePattern = /^\+?[0-9 ()-]{7,20}$/;

const registerSchema = z
  .object({
    fullName: z
      .string({ required_error: "Full name, email and password are required." })
      .trim()
      .min(1, "Full name, email and password are required.")
      .max(100, "Full name must be at most 100 characters."),
    email: emailField,
    password: newPasswordField,
    phone: optionalText(20, "Phone").refine(
      (value) => value === undefined || phonePattern.test(value),
      "Please enter a valid phone number."
    ),
    whatsappNumber: optionalText(20, "WhatsApp number").refine(
      (value) => value === undefined || phonePattern.test(value),
      "Please enter a valid WhatsApp number."
    ),
    businessName: optionalText(100, "Business name"),
  })
  .strict();

// Handles entrepreneur registration.
export async function POST(request: NextRequest) {
  try {
    // Any real-looking email address is allowed (client request), and the
    // password must follow the shared rules. Fields such as role or status
    // are rejected: a new account is always a PENDING entrepreneur.
    const parsed = await parseJsonBody(request, registerSchema);
    if (parsed.error) return parsed.error;

    const { fullName, email: normalizedEmail, phone, businessName, whatsappNumber, password } =
      parsed.data;

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
    // Two sign-ups with the same email at the same moment can both pass the
    // check above; the unique index on User.email stops the second one.
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    console.error("Registration error:", error);

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
