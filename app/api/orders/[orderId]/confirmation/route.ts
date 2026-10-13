import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireEntrepreneur } from "@/lib/api-auth";
import { idField, optionalText, parseFormBody } from "@/lib/request-validation";
import { saveUploadedFile } from "@/lib/upload";

const confirmationSchema = z
  .object({
    proofImage: z.instanceof(File, { message: "A proof photo and delivery date are required." }),
    deliveryDate: z.coerce.date({
      required_error: "A proof photo and delivery date are required.",
      invalid_type_error: "Delivery date is not a valid date.",
    }),
    notes: optionalText(1000, "Notes"),
  })
  .strict();

// The seller uploads proof that an order was handed over. This moves the
// order into the admin's verification queue:
// PENDING / AWAITING_FULFILLMENT -> PENDING_VERIFICATION -> VERIFIED / FLAGGED.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const { orderId } = await params;
    if (!idField.safeParse(orderId).success) return jsonError(404, "Order not found.");

    // Someone else's order gets the same 404 as a missing one.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { businessId: true, status: true, createdAt: true, salesConfirmation: { select: { id: true } } },
    });
    if (!order || order.businessId !== auth.business.id) {
      return jsonError(404, "Order not found.");
    }
    if (order.salesConfirmation) {
      return jsonError(409, "Proof has already been submitted for this order.");
    }
    if (order.status !== "PENDING" && order.status !== "AWAITING_FULFILLMENT") {
      return jsonError(409, `This order is ${order.status.toLowerCase().replace(/_/g, " ")}, so proof can't be added.`);
    }

    const parsed = await parseFormBody(request, confirmationSchema);
    if (parsed.error) return parsed.error;
    const { proofImage, deliveryDate, notes } = parsed.data;

    // A handover can't happen before the order existed or in the future.
    const latestAllowed = Date.now() + 24 * 60 * 60 * 1000; // allows for time zones
    if (deliveryDate.getTime() < order.createdAt.getTime() - 60_000 || deliveryDate.getTime() > latestAllowed) {
      return jsonError(400, "Delivery date must be between the order date and today.");
    }

    // All checks pass before the file is written, so a refused request
    // never leaves an orphan file behind.
    const proofImageUrl = await saveUploadedFile(proofImage, "sales-confirmations");

    const salesConfirmation = await prisma.$transaction(async (tx) => {
      const created = await tx.salesConfirmation.create({
        data: { orderId, proofImageUrl, deliveryDate, notes },
      });
      await tx.order.update({ where: { id: orderId }, data: { status: "PENDING_VERIFICATION" } });
      return created;
    });

    return NextResponse.json(
      { message: "Confirmation submitted for admin review.", salesConfirmation },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "Submit sales confirmation error", {
      conflict: "Proof has already been submitted for this order.",
      fallback: "Unable to submit confirmation.",
    });
  }
}
