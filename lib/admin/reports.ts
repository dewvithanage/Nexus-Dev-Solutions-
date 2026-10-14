import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SALES_TOTALS_MAX_AGE_SECONDS, SALES_TOTALS_TAG } from "./cache-tags";

// Data for Reports & Analytics, shared by the page and /api/admin/reports.
//
// Every figure is summed or counted by the database. The previous version
// loaded every order, and every category with all of its products, order
// items and orders, into memory and added them up in JavaScript, so it got
// slower with every sale.

const DAY_MS = 24 * 60 * 60 * 1000;
const notCancelled: Prisma.OrderWhereInput = { status: { not: "CANCELLED" } };

const percentChange = (current: number, previous: number) =>
  previous > 0 ? Number((((current - previous) / previous) * 100).toFixed(1)) : 0;

async function computeReportSummary() {
  const now = new Date();
  const startOfThisWeek = new Date(now.getTime() - 7 * DAY_MS);
  const startOfLastWeek = new Date(now.getTime() - 14 * DAY_MS);

  // Last 6 calendar months (server time), oldest first, for the trend line.
  const months = Array.from({ length: 6 }, (_, index) => {
    const offset = 5 - index;
    return {
      start: new Date(now.getFullYear(), now.getMonth() - offset, 1),
      end: new Date(now.getFullYear(), now.getMonth() - offset + 1, 1),
    };
  });

  const [
    verifiedTotal,
    totalOrders,
    thisWeek,
    lastWeek,
    activeEntrepreneurs,
    newEntrepreneursThisWeek,
    activeProducts,
    categoryRows,
    monthTotals,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { status: "VERIFIED" }, _sum: { totalAmount: true } }),
    prisma.order.count({ where: notCancelled }),
    prisma.order.aggregate({
      where: { ...notCancelled, createdAt: { gte: startOfThisWeek } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { ...notCancelled, createdAt: { gte: startOfLastWeek, lt: startOfThisWeek } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.entrepreneurProfile.count({ where: { status: "APPROVED" } }),
    prisma.entrepreneurProfile.count({ where: { status: "APPROVED", appliedAt: { gte: startOfThisWeek } } }),
    prisma.product.count({ where: { status: "APPROVED" } }),
    // Revenue by category: verified order lines of approved products.
    // Prisma can't sum price x quantity, so this one is plain SQL (all
    // values are fixed here; nothing comes from the request).
    prisma.$queryRaw<{ category: string; revenue: Prisma.Decimal }[]>`
      SELECT c."name" AS category, SUM(oi."unitPriceAtOrder" * oi."quantity") AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      JOIN "Product" p ON p."id" = oi."productId"
      JOIN "Category" c ON c."id" = p."categoryId"
      WHERE o."status" = 'VERIFIED' AND p."status" = 'APPROVED'
      GROUP BY c."id", c."name"
      HAVING SUM(oi."unitPriceAtOrder" * oi."quantity") > 0
      ORDER BY revenue DESC
    `,
    Promise.all(
      months.map(({ start, end }) =>
        prisma.order.aggregate({
          where: { status: "VERIFIED", createdAt: { gte: start, lt: end } },
          _sum: { totalAmount: true },
        })
      )
    ),
  ]);

  const revenueThisWeek = Number(thisWeek._sum.totalAmount ?? 0);
  const revenueLastWeek = Number(lastWeek._sum.totalAmount ?? 0);

  return {
    totalRevenue: Number(verifiedTotal._sum.totalAmount ?? 0),
    revenueChangePercent: percentChange(revenueThisWeek, revenueLastWeek),
    totalOrders,
    orderCountChangePercent: percentChange(thisWeek._count._all, lastWeek._count._all),
    activeEntrepreneurs,
    newEntrepreneursThisWeek,
    activeProducts,
    categoryRevenue: categoryRows.map((row) => ({ category: row.category, revenue: Number(row.revenue) })),
    monthlyTrend: months.map(({ start }, index) => ({
      month: start.toLocaleDateString("en-US", { month: "short" }),
      revenue: Number(monthTotals[index]._sum.totalAmount ?? 0),
    })),
  };
}

export type ReportSummary = Awaited<ReturnType<typeof computeReportSummary>>;

// Cached for all admins; verifying or flagging a sale clears it
// (SALES_TOTALS_TAG), and anything else shows up within a minute.
export const getReportSummary = unstable_cache(computeReportSummary, ["admin-report-summary"], {
  tags: [SALES_TOTALS_TAG],
  revalidate: SALES_TOTALS_MAX_AGE_SECONDS,
});
