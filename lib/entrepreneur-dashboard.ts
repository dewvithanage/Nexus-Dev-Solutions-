import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Called only after the page or API verifies the seller's session and business.
// Weekly comparisons use rolling seven-day periods based on order creation.
export async function getEntrepreneurDashboardStats(businessId: string) {
  const now = Date.now();

  const startOfThisWeek = new Date(now - WEEK_MS);
  const startOfLastWeek = new Date(now - 2 * WEEK_MS);

  const [
    activeProducts,
    pendingProducts,
    productsAddedThisWeek,
    completedSales,
    salesThisWeek,
    salesLastWeek,
    revenue,
    revenueThisWeek,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        businessId,
        status: "APPROVED",
      },
    }),

    prisma.product.count({
      where: {
        businessId,
        status: "PENDING",
      },
    }),

    prisma.product.count({
      where: {
        businessId,
        createdAt: {
          gte: startOfThisWeek,
        },
      },
    }),

    prisma.order.count({
      where: {
        businessId,
        status: "VERIFIED",
      },
    }),

    prisma.order.count({
      where: {
        businessId,
        status: "VERIFIED",
        createdAt: {
          gte: startOfThisWeek,
        },
      },
    }),

    prisma.order.count({
      where: {
        businessId,
        status: "VERIFIED",
        createdAt: {
          gte: startOfLastWeek,
          lt: startOfThisWeek,
        },
      },
    }),

    prisma.order.aggregate({
      where: {
        businessId,
        status: "VERIFIED",
      },
      _sum: {
        totalAmount: true,
      },
    }),

    prisma.order.aggregate({
      where: {
        businessId,
        status: "VERIFIED",
        createdAt: {
          gte: startOfThisWeek,
        },
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  const totalRevenue = Number(
    revenue._sum.totalAmount ?? 0
  );

  const weekRevenue = Number(
    revenueThisWeek._sum.totalAmount ?? 0
  );

  const salesChange =
    salesLastWeek > 0
      ? Math.round(
          ((salesThisWeek - salesLastWeek) /
            salesLastWeek) *
            100
        )
      : null;

  return {
    activeProducts,
    pendingProducts,
    productsAddedThisWeek,
    completedSales,
    salesThisWeek,
    salesLastWeek,
    totalRevenue,
    weekRevenue,
    salesChange,
  };
}

export type EntrepreneurDashboardStats = Awaited<ReturnType<typeof getEntrepreneurDashboardStats>>;
