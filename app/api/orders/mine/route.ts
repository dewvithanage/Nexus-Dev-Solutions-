import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireEntrepreneur } from "@/lib/api-auth";
import { computeOrderStats } from "@/lib/entrepreneur-data";

export async function GET() {
  try {
    const auth = await requireEntrepreneur({ approvedOnly: false });
    if (auth.error) return auth.error;

    const orders = await prisma.order.findMany({
      where: { businessId: auth.business.id },
      omit: { accessToken: true },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
        salesConfirmation: true,
      },
    });

    // Same calculation the Sales & Orders page uses (lib/entrepreneur-data.ts).
    const stats = computeOrderStats(
      orders.map((order) => ({ status: order.status, totalAmount: Number(order.totalAmount), items: order.items }))
    );

    return NextResponse.json({ orders, stats });
  } catch (error) {
    return handleRouteError(error, "Get my orders error", { fallback: "Unable to load orders." });
  }
}
