import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// "Flag Irregularity" in the Figma — for disputed transactions.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const notes = (body as { notes?: string }).notes;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: "FLAGGED" },
    });

    await prisma.salesConfirmation.update({
      where: { orderId },
      data: {
        verificationStatus: "FLAGGED",
        verifiedById: admin.id,
        verifiedAt: new Date(),
        ...(notes && { notes }),
      },
    });

    return NextResponse.json({ message: "Order flagged for review.", order });
  } catch (error) {
    console.error("Flag sale error:", error);
    return NextResponse.json({ message: "Unable to flag sale." }, { status: 500 });
  }
}
