import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { saveUploadedFile } from "@/lib/upload";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const businessId = user?.entrepreneurProfile?.business?.id;

    if (!user || user.role !== "ENTREPRENEUR" || !businessId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.businessId !== businessId) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("proofImage");
    const deliveryDate = formData.get("deliveryDate") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!(file instanceof File) || !deliveryDate) {
      return NextResponse.json({ message: "A proof photo and delivery date are required." }, { status: 400 });
    }

    const proofImageUrl = await saveUploadedFile(file, "sales-confirmations");

    const salesConfirmation = await prisma.salesConfirmation.create({
      data: {
        orderId,
        proofImageUrl,
        deliveryDate: new Date(deliveryDate),
        notes,
      },
    });

    // Moves the order into the admin's verification queue — matches the
    // lifecycle in the architecture doc: PENDING -> AWAITING_FULFILLMENT
    // -> PENDING_VERIFICATION -> VERIFIED (admin-confirmed) / FLAGGED.
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PENDING_VERIFICATION" },
    });

    return NextResponse.json({ message: "Confirmation submitted for admin review.", salesConfirmation }, { status: 201 });
  } catch (error) {
    console.error("Submit sales confirmation error:", error);
    return NextResponse.json({ message: "Unable to submit confirmation." }, { status: 500 });
  }
}
