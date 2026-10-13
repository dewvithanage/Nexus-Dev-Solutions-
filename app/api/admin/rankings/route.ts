import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { pageQuery, parseSearchParams } from "@/lib/request-validation";

const listQuerySchema = z.object({
  period: z.enum(["week", "month", "all"]).default("month"),
  ...pageQuery(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { period, page, pageSize } = query.data;

    const now = new Date();
    const since =
      period === "week"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : period === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(0);

    // Revenue per business is summed by the database (verified sales only),
    // instead of loading every business with all of its orders.
    const totals = await prisma.order.groupBy({
      by: ["businessId"],
      where: { status: "VERIFIED", createdAt: { gte: since } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });

    const businesses = await prisma.business.findMany({
      where: { id: { in: totals.map((row) => row.businessId) } },
      select: {
        id: true,
        businessName: true,
        entrepreneurProfile: { select: { user: { select: { name: true } } } },
      },
    });
    const businessById = new Map(businesses.map((business) => [business.id, business]));

    const allRankings = totals
      .flatMap((row) => {
        const business = businessById.get(row.businessId);
        if (!business) return [];
        return [{
          businessId: row.businessId,
          entrepreneurName: business.entrepreneurProfile.user.name,
          businessName: business.businessName,
          revenue: Number(row._sum.totalAmount ?? 0),
          orderCount: row._count._all,
        }];
      })
      .sort((a, b) => b.revenue - a.revenue);

    // The podium (top 3) is a fixed showcase, always returned in full;
    // only the table below it (rank 4 onward) is paginated.
    const podium = allRankings.slice(0, 3);
    const rest = allRankings.slice(3);

    const totalCount = rest.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const pagedRest = rest.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({
      podium,
      rankings: pagedRest,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    return handleRouteError(error, "Get rankings error", { fallback: "Unable to load rankings." });
  }
}
