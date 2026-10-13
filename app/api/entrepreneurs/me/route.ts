import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, requireEntrepreneur } from "@/lib/api";
import { profileUpdateSchema } from "@/lib/schemas";

// Powers BOTH the Business Profile page (edit form) and, indirectly, the
// public Entrepreneur Profile page (which reads the same Business record
// through a separate public endpoint — this one requires login).
//
// There is no id in the URL: the profile and business are always the ones
// belonging to the signed-in entrepreneur (from the session), so one
// entrepreneur can never read or edit another's.
export async function GET() {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const { business, ...entrepreneurProfile } = auth.profile;

    return NextResponse.json({ entrepreneurProfile, business });
  } catch (error) {
    console.error("Get own business error:", error);
    return NextResponse.json({ message: "Unable to load business profile." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    // Only the fields in profileUpdateSchema can be changed. Anything else
    // (status, userId, reviewedById, logoUrl, ...) is rejected with 400.
    const parsed = await parseJsonBody(request, profileUpdateSchema);
    if (parsed.error) return parsed.error;

    const {
      businessName,
      description,
      businessCategory,
      instagramHandle,
      websiteUrl,
      businessHours,
      pickupLocationNotes,
      university,
      whatsappNumber,
      bio,
    } = parsed.data;

    // Two separate models get updated here (Business + EntrepreneurProfile)
    // because the one settings page on the frontend edits fields that live
    // on both — "Faculty" belongs to EntrepreneurProfile, "Business Name"
    // belongs to Business, etc. A transaction makes it all-or-nothing.
    const [business, entrepreneurProfile] = await prisma.$transaction([
      prisma.business.update({
        where: { id: auth.business.id },
        data: {
          businessName,
          description,
          businessCategory,
          instagramHandle,
          websiteUrl,
          businessHours,
          pickupLocationNotes,
        },
      }),
      prisma.entrepreneurProfile.update({
        where: { id: auth.profile.id },
        data: { university, whatsappNumber, bio },
      }),
    ]);

    return NextResponse.json({ message: "Profile updated.", business, entrepreneurProfile });
  } catch (error) {
    console.error("Update business profile error:", error);
    return NextResponse.json({ message: "Unable to update profile." }, { status: 500 });
  }
}
