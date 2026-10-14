import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { pageQuery, parseSearchParams } from "@/lib/request-validation";

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "FLAGGED"]).optional(),
  ...pageQuery(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { status, page, pageSize } = query.data;

    // "PENDING" on this page means every order that hasn't been decided yet.
    const where: Prisma.OrderWhereInput =
      status === "PENDING"
        ? { status: { in: ["PENDING", "AWAITING_FULFILLMENT", "PENDING_VERIFICATION"] } }
        : status
        ? { status }
        : {};

    const totalCount = await prisma.order.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const rows = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        business: {
          select: {
            businessName: true,
            entrepreneurProfile: { select: { user: { select: { name: true } } } },
          },
        },
        items: { include: { product: { select: { name: true } } } },
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
    return handleRouteError(error, "Get sales error", { fallback: "Unable to load orders." });
  }
}
