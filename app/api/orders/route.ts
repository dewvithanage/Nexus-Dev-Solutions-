import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Creates one Order for ONE business, from a list of cart items the
// browser sends. Guest checkout — no login needed (see architecture doc,
// Risk 1). Per Risk 5 in the same doc: the order must be saved to the
// database BEFORE the frontend redirects to WhatsApp, since there's no
// way to know if the WhatsApp message actually gets sent.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessId,
      buyerName,
      buyerPhone,
      deliveryLocation,
      messageToEntrepreneur,
      items,
    } = body as {
      businessId?: string;
      buyerName?: string;
      buyerPhone?: string;
      deliveryLocation?: string;
      messageToEntrepreneur?: string;
      items?: { productId: string; quantity: number }[];
    };

    if (!businessId || !buyerName || !buyerPhone || !deliveryLocation || !items?.length) {
      return NextResponse.json(
        { message: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    // Look up real, current prices from the database — never trust a
    // price the browser sends, since it could have been tampered with.
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((item) => item.productId) }, businessId, status: "APPROVED" },
    });

    if (products.length !== items.length) {
      return NextResponse.json(
        { message: "One or more items are no longer available." },
        { status: 400 }
      );
    }

    const totalAmount = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + Number(product.price) * item.quantity;
    }, 0);

    const order = await prisma.order.create({
      data: {
        businessId,
        buyerName,
        buyerPhone,
        deliveryLocation,
        messageToEntrepreneur,
        totalAmount,
        status: "PENDING",
        items: {
          create: items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPriceAtOrder: product.price,
            };
          }),
        },
      },
    });


    // Notify the entrepreneur that owns this business — this is what
    // populates their Notification Center ("New WhatsApp Coordination
    // Inquiry" style entries in the Figma).
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { entrepreneurProfile: true },
    });
    if (business) {
      await prisma.notification.create({
        data: {
          userId: business.entrepreneurProfile.userId,
          type: "ORDER",
          title: "New Order Received",
          message: `${buyerName} placed an order for Rs.${totalAmount.toFixed(2)}. Coordinate pickup via WhatsApp.`,
          relatedEntityType: "Order",
          relatedEntityId: order.id,
        },
      });
    }


    return NextResponse.json({ message: "Order created.", orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ message: "Unable to create order." }, { status: 500 });
  }
}
