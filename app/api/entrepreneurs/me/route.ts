import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireEntrepreneur } from "@/lib/api-auth";
import { optionalText, parseJsonBody, phonePattern, requiredText } from "@/lib/request-validation";

// Every field the Business Profile page can edit. Anything else (status,
// owner ids, logoUrl) is rejected. Pending accounts may edit their profile
// while they wait for approval.
const profileSchema = z
  .object({
    businessName: requiredText(100, "Business name"),
    description: optionalText(2000, "Description"),
    businessCategory: optionalText(60, "Business category"),
    instagramHandle: optionalText(31, "Instagram handle").refine(
      (value) => value === null || /^@?[A-Za-z0-9._]{1,30}$/.test(value),
      "Instagram handle can only contain letters, numbers, dots and underscores."
    ),
    // Only http(s) links, so a "javascript:" link can never be saved.
    websiteUrl: optionalText(200, "Website").refine(
      (value) => value === null || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(value),
      "Website must be a full link starting with http:// or https://."
    ),
    businessHours: optionalText(200, "Business hours"),
    pickupLocationNotes: optionalText(500, "Pickup location notes"),
    university: optionalText(100, "Faculty"),
    whatsappNumber: optionalText(20, "WhatsApp number").refine(
      (value) => value === null || phonePattern.test(value),
      "Please enter a valid WhatsApp number."
    ),
    bio: optionalText(1000, "Bio"),
  })
  .partial()
  .strict();

// Powers the Business Profile page (edit form). The public storefront reads
// the same Business record through /api/businesses/[businessId].
export async function GET() {
  try {
    const auth = await requireEntrepreneur({ approvedOnly: false });
    if (auth.error) return auth.error;

    return NextResponse.json({ entrepreneurProfile: auth.profile, business: auth.business });
  } catch (error) {
    return handleRouteError(error, "Get own business error", { fallback: "Unable to load business profile." });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireEntrepreneur({ approvedOnly: false });
    if (auth.error) return auth.error;

    const parsed = await parseJsonBody(request, profileSchema);
    if (parsed.error) return parsed.error;
    const { university, whatsappNumber, bio, ...businessFields } = parsed.data;

    // The settings page edits fields that live on two tables (Faculty is on
    // EntrepreneurProfile, Business Name on Business); both update together.
    const [business, entrepreneurProfile] = await prisma.$transaction([
      prisma.business.update({
        where: { id: auth.business.id },
        data: businessFields,
      }),
      prisma.entrepreneurProfile.update({
        where: { id: auth.profile.id },
        data: {
          ...(university !== undefined && { university }),
          // The column can't be empty-null; an empty value clears it to "".
          ...(whatsappNumber !== undefined && { whatsappNumber: whatsappNumber ?? "" }),
          ...(bio !== undefined && { bio }),
        },
      }),
    ]);

    return NextResponse.json({ message: "Profile updated.", business, entrepreneurProfile });
  } catch (error) {
    return handleRouteError(error, "Update business profile error", { fallback: "Unable to update profile." });
  }
}
