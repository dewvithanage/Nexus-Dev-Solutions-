import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";

// The guest's order confirmation (WhatsApp hand-off) page. Guests have no
// account, so the order is protected by the secret access token they got
// when placing it (?token=...). Without the right token the order looks
// like it doesn't exist, so an order id alone reveals nothing.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const token = request.nextUrl.searchParams.get("token") ?? "";
    if (!idField.safeParse(orderId).success || !/^[a-f0-9]{48}$/.test(token)) {
      return jsonError(404, "Order not found.");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
        deliveryLocation: true,
        status: true,
        accessToken: true,
        items: { select: { quantity: true, unitPriceAtOrder: true, product: { select: { name: true } } } },
        business: {
          select: {
            entrepreneurProfile: { select: { whatsappNumber: true, user: { select: { name: true } } } },
          },
        },
      },
    });

    // Constant-time comparison, so the token can't be guessed byte by byte.
    const tokenMatches =
      !!order?.accessToken &&
      crypto.timingSafeEqual(Buffer.from(order.accessToken), Buffer.from(token));
    if (!order || !tokenMatches) {
      return jsonError(404, "Order not found.");
    }

    return NextResponse.json({
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
        deliveryLocation: order.deliveryLocation,
        status: order.status,
        entrepreneurName: order.business.entrepreneurProfile.user.name,
        entrepreneurWhatsApp: order.business.entrepreneurProfile.whatsappNumber,
        items: order.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPriceAtOrder,
        })),
      },
    });
  } catch (error) {
    return handleRouteError(error, "Get order error", { fallback: "Unable to load order." });
  }
}
