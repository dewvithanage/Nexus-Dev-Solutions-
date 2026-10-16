import { prisma } from "@/lib/prisma";

// Figures and recent activity for the Admin Dashboard.
export async function getDashboardData() {
  // Independent queries, run in parallel rather than one after another.
  const [
    totalEntrepreneurs,
    pendingEntrepreneurs,
    pendingProducts,
    activeProducts,
    ordersCount,
    verifiedSales,
    recentEntrepreneurs,
    recentProducts,
  ] = await Promise.all([
    prisma.entrepreneurProfile.count(),
    prisma.entrepreneurProfile.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "APPROVED" } }),
    prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
    // Only admin-verified sales count as revenue, the same rule Reports and
    // Rankings use, so the numbers agree across pages.
    prisma.order.aggregate({ where: { status: "VERIFIED" }, _sum: { totalAmount: true } }),
    prisma.entrepreneurProfile.findMany({
      take: 5,
      orderBy: { appliedAt: "desc" },
      select: {
        status: true,
        appliedAt: true,
        user: { select: { name: true } },
        business: { select: { businessName: true } },
      },
    }),
    prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { name: true, status: true, createdAt: true, business: { select: { businessName: true } } },
    }),
  ]);

  // Combine the two "recent activity" lists into one, sorted newest first.
  // This is a simple stand-in for a real audit log.
  const activity = [
    ...recentEntrepreneurs.map((entrepreneur) => ({
      type: "Registration",
      name: entrepreneur.user.name,
      description: `Applied for "${entrepreneur.business?.businessName ?? "their business"}"`,
      status: entrepreneur.status,
      date: entrepreneur.appliedAt,
    })),
    ...recentProducts.map((product) => ({
      type: "Product Submit",
      name: product.business.businessName,
      description: `Submitted "${product.name}"`,
      status: product.status,
      date: product.createdAt,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
    // Only plain, JSON-serializable data can be passed from a Server
    // Component to a Client Component, so the Date is dropped.
    .map(({ date, ...rest }) => rest);

  return {
    totalEntrepreneurs,
    pendingEntrepreneurs,
    pendingProducts,
    activeProducts,
    ordersCount,
    totalSalesVolume: Number(verifiedSales._sum.totalAmount ?? 0),
    activity,
  };
}
