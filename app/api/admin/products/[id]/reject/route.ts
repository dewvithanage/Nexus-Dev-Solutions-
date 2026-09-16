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
    });

    return NextResponse.json({ message: "Product rejected.", product });
  } catch (error) {
    console.error("Reject product error:", error);
    return NextResponse.json({ message: "Unable to reject product." }, { status: 500 });
  }
}
