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

    const product = await prisma.product.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason: null,
      },
      include: {
        business: { include: { entrepreneurProfile: true } },
      },
    });

    // FIX: this route previously did NOT create a notification at all.
    await prisma.notification.create({
      data: {
        userId: product.business.entrepreneurProfile.userId,
        type: "PRODUCT",
        title: "Your Product Has Been Approved!",
        message: `"${product.name}" was successfully reviewed and is now live in the student catalog.`,
        relatedEntityType: "Product",
        relatedEntityId: product.id,
      },
    });

    return NextResponse.json({ message: "Product approved and published.", product });
  } catch (error) {
    console.error("Approve product error:", error);
    return NextResponse.json({ message: "Unable to approve product." }, { status: 500 });
  }
}
