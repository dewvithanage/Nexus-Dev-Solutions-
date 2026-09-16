import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Defense in depth: middleware.ts already blocks non-admins from
    // reaching this route, but we check again here so this file is safe
    // on its own even if middleware config ever changes.
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    const entrepreneur = await prisma.entrepreneurProfile.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason: null,
      },
    });

    return NextResponse.json({ message: "Entrepreneur approved.", entrepreneur });
  } catch (error) {
    console.error("Approve entrepreneur error:", error);
    return NextResponse.json({ message: "Unable to approve entrepreneur." }, { status: 500 });
  }
}
