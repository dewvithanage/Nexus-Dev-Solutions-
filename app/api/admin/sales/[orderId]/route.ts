import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Admin only: this returns buyer details and payment proof.
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { orderId } = await params;
    if (!idField.safeParse(orderId).success) return jsonError(404, "Order not found.");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      omit: { accessToken: true },
      include: {
        business: {
          include: {
            entrepreneurProfile: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        items: { include: { product: { select: { id: true, name: true } } } },
        salesConfirmation: {
          include: { verifiedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!order) {
      return jsonError(404, "Order not found.");
    }

    return NextResponse.json({ order });
  } catch (error) {
    return handleRouteError(error, "Get order details error", { fallback: "Unable to load order." });
  }
}
