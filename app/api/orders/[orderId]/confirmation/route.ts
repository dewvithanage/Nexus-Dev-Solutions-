import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation, jsonError, requireEntrepreneur, validationError } from "@/lib/api";
import { salesConfirmationSchema } from "@/lib/schemas";
import { saveUploadedFile, UploadValidationError } from "@/lib/upload";

// Proof can only be submitted while the order is still open. Once it is
// PENDING_VERIFICATION, VERIFIED, FLAGGED or CANCELLED the admin has it.
const OPEN_STATUSES = ["PENDING", "AWAITING_FULFILLMENT"];

const ALLOWED_FIELDS = new Set(["proofImage", "deliveryDate", "notes"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const { orderId } = await params;

    // Another business's order gets the same 404 as a missing one.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { businessId: true, status: true, salesConfirmation: { select: { id: true } } },
    });
    if (!order || order.businessId !== auth.business.id) {
      return jsonError("Order not found.", 404);
    }

    if (order.salesConfirmation) {
      return jsonError("Proof has already been submitted for this order.", 409);
    }
    if (!OPEN_STATUSES.includes(order.status)) {
      return jsonError("This order is no longer accepting proof of delivery.", 409);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError("Send the proof as multipart/form-data.", 400);
    }

    const unexpected = [...new Set(formData.keys())].filter((key) => !ALLOWED_FIELDS.has(key));
    if (unexpected.length > 0) {
      return jsonError(`Unexpected field(s): ${unexpected.join(", ")}.`, 400);
    }

    const file = formData.get("proofImage");
    if (!(file instanceof File)) {
      return jsonError("A proof photo and delivery date are required.", 400);
    }

    const fields = salesConfirmationSchema.safeParse({
      deliveryDate: formData.get("deliveryDate") ?? undefined,
      notes: formData.get("notes") ?? undefined,
    });
    if (!fields.success) {
      return validationError(fields.error);
    }

    // Saved only after everything else has been checked, so a rejected
    // request leaves no stray file behind.
    const proofImageUrl = await saveUploadedFile(file, "sales-confirmations");

    // Moves the order into the admin's verification queue — matches the
    // lifecycle in the architecture doc: PENDING -> AWAITING_FULFILLMENT
    // -> PENDING_VERIFICATION -> VERIFIED (admin-confirmed) / FLAGGED.
    // Both writes happen together or not at all.
    const [salesConfirmation] = await prisma.$transaction([
      prisma.salesConfirmation.create({
        data: {
          orderId,
          proofImageUrl,
          deliveryDate: fields.data.deliveryDate,
          notes: fields.data.notes ?? null,
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { status: "PENDING_VERIFICATION" },
      }),
    ]);

    return NextResponse.json({ message: "Confirmation submitted for admin review.", salesConfirmation }, { status: 201 });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return jsonError(error.message, 400);
    }
    // Two submissions at the same moment: SalesConfirmation.orderId is
    // unique, so the database rejects the second one.
    if (isUniqueViolation(error)) {
      return jsonError("Proof has already been submitted for this order.", 409);
    }
    console.error("Submit sales confirmation error:", error);
    return NextResponse.json({ message: "Unable to submit confirmation." }, { status: 500 });
  }
}
