import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Powers BOTH the Business Profile page (edit form) and, indirectly, the
// public Entrepreneur Profile page (which reads the same Business record
// through a separate public endpoint — this one requires login).
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ENTREPRENEUR" || !user.entrepreneurProfile) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json({
      entrepreneurProfile: user.entrepreneurProfile,
      business: user.entrepreneurProfile.business,
    });
  } catch (error) {
    console.error("Get own business error:", error);
    return NextResponse.json({ message: "Unable to load business profile." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const entrepreneurProfileId = user?.entrepreneurProfile?.id;
    const businessId = user?.entrepreneurProfile?.business?.id;

    if (!user || user.role !== "ENTREPRENEUR" || !entrepreneurProfileId || !businessId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
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
    } = body as {
      businessName?: string;
      description?: string;
      businessCategory?: string;
      instagramHandle?: string;
      websiteUrl?: string;
      businessHours?: string;
      pickupLocationNotes?: string;
      university?: string;
      whatsappNumber?: string;
      bio?: string;
    };

    // Two separate models get updated here (Business + EntrepreneurProfile)
    // because the one settings page on the frontend edits fields that live
    // on both — "Faculty" belongs to EntrepreneurProfile, "Business Name"
    // belongs to Business, etc.
    const [business, entrepreneurProfile] = await Promise.all([
      prisma.business.update({
        where: { id: businessId },
        data: {
          ...(businessName !== undefined && { businessName }),
          ...(description !== undefined && { description }),
          ...(businessCategory !== undefined && { businessCategory }),
          ...(instagramHandle !== undefined && { instagramHandle }),
          ...(websiteUrl !== undefined && { websiteUrl }),
          ...(businessHours !== undefined && { businessHours }),
          ...(pickupLocationNotes !== undefined && { pickupLocationNotes }),
        },
      }),
      prisma.entrepreneurProfile.update({
        where: { id: entrepreneurProfileId },
        data: {
          ...(university !== undefined && { university }),
          ...(whatsappNumber !== undefined && { whatsappNumber }),
          ...(bio !== undefined && { bio }),
        },
      }),
    ]);

    return NextResponse.json({ message: "Profile updated.", business, entrepreneurProfile });
  } catch (error) {
    console.error("Update business profile error:", error);
    return NextResponse.json({ message: "Unable to update profile." }, { status: 500 });
  }
}
