import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { SALES_TOTALS_TAG } from "@/lib/admin/cache-tags";
import { idField, optionalText, parseOptionalJsonBody } from "@/lib/request-validation";

const flagSchema = z.object({ notes: optionalText(1000, "Notes") }).strict();

// "Flag Irregularity" in the Figma — for disputed transactions. A sale can
// be flagged once proof has been submitted, including after it was
// verified (a dispute can come up later).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { orderId } = await params;
    if (!idField.safeParse(orderId).success) return jsonError(404, "Order not found.");

    const parsed = await parseOptionalJsonBody(request, flagSchema);
    if (parsed.error) return parsed.error;
    const { notes } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        status: true,
        salesConfirmation: { select: { id: true } },
        business: { select: { entrepreneurProfile: { select: { userId: true } } } },
      },
    });
    if (!order) return jsonError(404, "Order not found.");
    if (!order.salesConfirmation) {
      return jsonError(409, "The seller hasn't uploaded proof for this order yet, so there is nothing to flag.");
    }
    if (order.status !== "PENDING_VERIFICATION" && order.status !== "VERIFIED") {
      return jsonError(409, `This order is ${order.status.toLowerCase().replace(/_/g, " ")}, so it can't be flagged.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: orderId },
        data: { status: "FLAGGED" },
        omit: { accessToken: true },
      });
      await tx.salesConfirmation.update({
        where: { orderId },
        data: {
          verificationStatus: "FLAGGED",
          verifiedById: auth.admin.id,
          verifiedAt: new Date(),
          ...(notes && { notes }),
        },
      });
      await tx.notification.create({
        data: {
          userId: order.business.entrepreneurProfile.userId,
          type: "ORDER",
          title: "Sale Flagged for Review",
          message: notes
            ? `An admin flagged one of your sales: ${notes}`
            : "An admin flagged one of your sales for review. The Startup Spark team will contact you.",
          relatedEntityType: "Order",
          relatedEntityId: orderId,
        },
      });
      return result;
    });

    // Reports and Rankings count verified sales; show the change straight away.
    revalidateTag(SALES_TOTALS_TAG);

    return NextResponse.json({ message: "Order flagged for review.", order: updated });
  } catch (error) {
    return handleRouteError(error, "Flag sale error", {
      notFound: "Order not found.",
      fallback: "Unable to flag sale.",
    });
  }
}
