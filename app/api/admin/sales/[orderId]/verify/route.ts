import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// "Confirm & Release" in the Figma — marks the order as VERIFIED,
// which is what "releases the escrow" means in our simulated system
// (see Risk 4 in the architecture doc: no real money moves, this is
// just a status change).
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

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: "VERIFIED" },
    });

    if (order) {
      await prisma.salesConfirmation.update({
        where: { orderId },
        data: {
          verificationStatus: "VERIFIED",
          verifiedById: admin.id,
          verifiedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ message: "Sale verified and escrow released.", order });
  } catch (error) {
    console.error("Verify sale error:", error);
    return NextResponse.json({ message: "Unable to verify sale." }, { status: 500 });
  }
}
