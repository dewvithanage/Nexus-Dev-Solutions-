import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns one order with enough detail to render the WhatsApp Confirmation
// page and build the wa.me link. Public (no login needed) since the buyer
// is a guest — but only returns what's needed for that one screen, no
// sensitive business data.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        business: {
          include: {
            entrepreneurProfile: { include: { user: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
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
    console.error("Get order error:", error);
    return NextResponse.json({ message: "Unable to load order." }, { status: 500 });
  }
}
