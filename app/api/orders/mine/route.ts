import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const businessId = user?.entrepreneurProfile?.business?.id;

    if (!user || user.role !== "ENTREPRENEUR" || !businessId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
        salesConfirmation: true,
      },
    });

    const totalRevenue = orders
      .filter((order) => order.status === "VERIFIED")
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // Cancelled orders were never real completed transactions, so they're
    // excluded here — everything else (pending, verified, even flagged)
    // still represents a real order that was placed.
    const ordersForAverage = orders.filter((order) => order.status !== "CANCELLED");
    const averageOrderValue = ordersForAverage.length > 0
      ? ordersForAverage.reduce((sum, order) => sum + Number(order.totalAmount), 0) / ordersForAverage.length
      : 0;

    const unitsDelivered = orders
      .filter((order) => order.status === "VERIFIED")
      .reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0);

    // FIX: previously only counted PENDING_VERIFICATION and
    // AWAITING_FULFILLMENT, which silently excluded brand-new PENDING
    // orders (payment proof not uploaded yet) from "money in the
    // pipeline." Any order that hasn't reached a final state (VERIFIED,
    // FLAGGED, or CANCELLED) still represents pending/unreleased money,
    // so all of those now correctly count toward Pending Escrow.
    const pendingEscrow = orders
      .filter((order) =>
        order.status === "PENDING" ||
        order.status === "AWAITING_FULFILLMENT" ||
        order.status === "PENDING_VERIFICATION"
      )
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    return NextResponse.json({
      orders,
      stats: { totalRevenue, averageOrderValue, unitsDelivered, pendingEscrow },
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    return NextResponse.json({ message: "Unable to load orders." }, { status: 500 });
  }
}
