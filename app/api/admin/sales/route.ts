import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Powers the Financial Sales Verification page — admins review orders
// that entrepreneurs have submitted fulfillment proof for.
export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    // "PENDING" here means "pending admin verification", which in our
    // Order lifecycle is the PENDING_VERIFICATION status (see the
    // architecture doc's order lifecycle diagram).
    const statusMap: Record<string, string> = {
      PENDING: "PENDING_VERIFICATION",
      VERIFIED: "VERIFIED",
      FLAGGED: "FLAGGED",
    };

    const where = statusParam && statusMap[statusParam] ? { status: statusMap[statusParam] as never } : {};

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        business: { include: { entrepreneurProfile: { include: { user: true } } } },
        items: { include: { product: true } },
        salesConfirmation: true,
      },
    });

    const results = orders.map((order) => ({
      id: order.id,
      buyerName: order.buyerName,
      sellerName: order.business.entrepreneurProfile.user.name,
      businessName: order.business.businessName,
      productNames: order.items.map((item) => item.product.name).join(", "),
      totalAmount: order.totalAmount,
      status: order.status,
      hasProof: Boolean(order.salesConfirmation),
      createdAt: order.createdAt,
    }));

    return NextResponse.json({ orders: results });
  } catch (error) {
    console.error("Get admin sales error:", error);
    return NextResponse.json({ message: "Unable to load sales." }, { status: 500 });
  }
}
