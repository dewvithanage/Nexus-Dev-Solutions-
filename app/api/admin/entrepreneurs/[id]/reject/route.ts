import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const rejectionReason = (body as { rejectionReason?: string }).rejectionReason || null;

    const entrepreneur = await prisma.entrepreneurProfile.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason,
      },
    });

    await prisma.notification.create({
      data: {
        userId: entrepreneur.userId,
        type: "SYSTEM",
        title: "Registration Application Update",
        message: rejectionReason
          ? `Your application was not approved: ${rejectionReason}`
          : "Your application was not approved this time.",
        relatedEntityType: "EntrepreneurProfile",
        relatedEntityId: entrepreneur.id,
      },
    });

    return NextResponse.json({ message: "Entrepreneur rejected.", entrepreneur });
  } catch (error) {
    console.error("Reject entrepreneur error:", error);
    return NextResponse.json({ message: "Unable to reject entrepreneur." }, { status: 500 });
  }
}
