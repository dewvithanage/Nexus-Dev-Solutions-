import { unstable_cache } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pageQuery } from "@/lib/request-validation";
import { SALES_TOTALS_MAX_AGE_SECONDS, SALES_TOTALS_TAG } from "./cache-tags";

// Data for Entrepreneur Rankings, shared by the page and /api/admin/rankings.

export const rankingsQuerySchema = z.object({
  period: z.enum(["week", "month", "all"]).default("month"),
  ...pageQuery(),
});

export type RankingsQuery = z.infer<typeof rankingsQuerySchema>;
export type RankingEntry = {
  businessId: string;
  entrepreneurName: string;
  businessName: string;
  revenue: number;
  orderCount: number;
};

// Every business with verified sales in the period, highest revenue first.
async function computeRankings(period: RankingsQuery["period"]): Promise<RankingEntry[]> {
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

  return totals
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
}

// Cached per period; verifying or flagging a sale clears it (SALES_TOTALS_TAG).
const cachedRankings = unstable_cache(computeRankings, ["admin-rankings"], {
  tags: [SALES_TOTALS_TAG],
  revalidate: SALES_TOTALS_MAX_AGE_SECONDS,
});

export async function getRankings({ period, page, pageSize }: RankingsQuery) {
  const allRankings = await cachedRankings(period);

  // The podium (top 3) is a fixed showcase, always returned in full;
  // only the table below it (rank 4 onward) is paginated.
  const podium = allRankings.slice(0, 3);
  const rest = allRankings.slice(3);
  const totalCount = rest.length;

  return {
    podium,
    rankings: rest.slice((page - 1) * pageSize, page * pageSize),
    pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), totalCount, pageSize },
  };
}

export type Rankings = Awaited<ReturnType<typeof getRankings>>;
