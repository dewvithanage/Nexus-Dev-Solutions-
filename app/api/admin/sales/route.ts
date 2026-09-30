import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const ITEMS_PER_PAGE = 10;

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const statusFilter = params.get("status"); // "PENDING" | "VERIFIED" | "FLAGGED"
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Number(params.get("pageSize")) || ITEMS_PER_PAGE;

    const where =
      statusFilter === "PENDING"
        ? { status: { in: ["PENDING", "AWAITING_FULFILLMENT", "PENDING_VERIFICATION"] as const } }
        : statusFilter
        ? { status: statusFilter as "VERIFIED" | "FLAGGED" }
        : {};

    const totalCount = await prisma.order.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const rows = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        business: { include: { entrepreneurProfile: { include: { user: true } } } },
        items: { include: { product: true } },
      },
    });

    const orders = rows.map((order) => ({
      id: order.id,
      buyerName: order.buyerName,
      sellerName: order.business.entrepreneurProfile.user.name,
      businessName: order.business.businessName,
      productNames: order.items.map((i) => i.product.name).join(", "),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
    }));

    return NextResponse.json({
      orders,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    console.error("Get sales error:", error);
    return NextResponse.json({ message: "Unable to load orders." }, { status: 500 });
  }
}
