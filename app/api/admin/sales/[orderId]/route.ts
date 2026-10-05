import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Admin only: this returns buyer details and payment proof.
    // 401 = not signed in, 403 = signed in but not an admin.
    const admin = await getCurrentUser();
    if (!admin) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }
    if (admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { orderId } = await params;

    // "omit" strips the secret columns from every User record included
    // below. Without it, "user: true" / "verifiedBy: true" sent the seller's
    // and the verifying admin's passwordHash and reset token to the browser.
    // Everything else on those records is still returned, so the page that
    // reads this response keeps working unchanged.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        business: {
          include: {
            entrepreneurProfile: {
              include: {
                user: { omit: { passwordHash: true, resetToken: true, resetTokenExpiry: true } },
              },
            },
          },
        },
        items: { include: { product: true } },
        salesConfirmation: {
          include: {
            verifiedBy: { omit: { passwordHash: true, resetToken: true, resetTokenExpiry: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Get order details error:", error);
    return NextResponse.json({ message: "Unable to load order." }, { status: 500 });
  }
}
