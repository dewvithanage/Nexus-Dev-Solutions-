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

    const product = await prisma.product.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason,
      },
      // Need the business -> entrepreneurProfile -> userId chain since
      // Product itself doesn't store who owns it directly, only which
      // business does — this is what lets us know who to notify.
      include: {
        business: { include: { entrepreneurProfile: true } },
      },
    });

    // FIX: this route previously did NOT create a notification at all —
    // rejecting a product silently updated its status with no way for
    // the entrepreneur to find out why (or that it happened) other than
    // manually checking Submission Status.
    await prisma.notification.create({
      data: {
        userId: product.business.entrepreneurProfile.userId,
        type: "PRODUCT",
        title: "Product Submission Rejected",
        message: rejectionReason
          ? `"${product.name}" was not approved: ${rejectionReason}`
          : `"${product.name}" was not approved this time.`,
        relatedEntityType: "Product",
        relatedEntityId: product.id,
      },
    });

    return NextResponse.json({ message: "Product rejected.", product });
  } catch (error) {
    console.error("Reject product error:", error);
    return NextResponse.json({ message: "Unable to reject product." }, { status: 500 });
  }
}
