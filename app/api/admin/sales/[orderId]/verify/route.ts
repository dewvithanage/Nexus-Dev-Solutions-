import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { SALES_TOTALS_TAG } from "@/lib/admin/cache-tags";
import { idField } from "@/lib/request-validation";

// "Confirm & Release" in the Figma — marks the order as VERIFIED, which is
// what "releases the escrow" means in our simulated system (no real money
// moves, this is just a status change).
//
// Only an order whose seller has uploaded proof (PENDING_VERIFICATION) can
// be verified, and the order and its proof are updated together, so an
// order can never end up VERIFIED without a verified proof record.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { orderId } = await params;
    if (!idField.safeParse(orderId).success) return jsonError(404, "Order not found.");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        totalAmount: true,
        salesConfirmation: { select: { id: true } },
        business: { select: { entrepreneurProfile: { select: { userId: true } } } },
      },
    });
    if (!order) return jsonError(404, "Order not found.");
    if (!order.salesConfirmation) {
      return jsonError(409, "The seller hasn't uploaded proof for this order yet, so it can't be verified.");
    }
    if (order.status !== "PENDING_VERIFICATION") {
      return jsonError(409, `This order is ${order.status.toLowerCase().replace(/_/g, " ")}, so it can't be verified.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: { status: "VERIFIED" },
        omit: { accessToken: true },
      });
      await tx.salesConfirmation.update({
        where: { orderId },
        data: { verificationStatus: "VERIFIED", verifiedById: auth.admin.id, verifiedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: order.business.entrepreneurProfile.userId,
          type: "ORDER",
          title: "Sale Verified",
          message: `Your sale of Rs.${Number(order.totalAmount).toFixed(2)} was verified and the escrow released.`,
          relatedEntityType: "Order",
          relatedEntityId: orderId,
        },
      });
      return result;
    });

    // Reports and Rankings count verified sales; show the change straight away.
    revalidateTag(SALES_TOTALS_TAG);

    return NextResponse.json({ message: "Sale verified and escrow released.", order: updated });
  } catch (error) {
    return handleRouteError(error, "Verify sale error", {
      notFound: "Order not found.",
      fallback: "Unable to verify sale.",
    });
  }
}
