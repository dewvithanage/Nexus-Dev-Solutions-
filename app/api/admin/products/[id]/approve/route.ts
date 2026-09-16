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
    });

    return NextResponse.json({ message: "Product approved and published.", product });
  } catch (error) {
    console.error("Approve product error:", error);
    return NextResponse.json({ message: "Unable to approve product." }, { status: 500 });
  }
}
