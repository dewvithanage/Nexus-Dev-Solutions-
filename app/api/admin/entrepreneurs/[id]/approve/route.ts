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

    const entrepreneur = await prisma.entrepreneurProfile.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason: null,
      },
    });

    // Notify the entrepreneur — this is what makes their Notification
    // Center actually show something when an admin acts on their account.
    await prisma.notification.create({
      data: {
        userId: entrepreneur.userId,
        type: "SYSTEM",
        title: "Your Registration Has Been Approved!",
        message: "You can now add products and start selling on StartupSpark.",
        relatedEntityType: "EntrepreneurProfile",
        relatedEntityId: entrepreneur.id,
      },
    });

    return NextResponse.json({ message: "Entrepreneur approved.", entrepreneur });
  } catch (error) {
    console.error("Approve entrepreneur error:", error);
    return NextResponse.json({ message: "Unable to approve entrepreneur." }, { status: 500 });
  }
}
