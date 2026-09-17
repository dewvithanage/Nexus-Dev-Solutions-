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

    const averageOrderValue = orders.length > 0
      ? orders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / orders.length
      : 0;

    const unitsDelivered = orders
      .filter((order) => order.status === "VERIFIED")
      .reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0);

    const pendingEscrow = orders
      .filter((order) => order.status === "PENDING_VERIFICATION" || order.status === "AWAITING_FULFILLMENT")
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
