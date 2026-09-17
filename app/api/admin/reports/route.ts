import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfThisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      verifiedOrders,
      allOrders,
      allEntrepreneurs,
      newEntrepreneursThisWeek,
      activeProducts,
      categories,
    ] = await Promise.all([
      prisma.order.findMany({ where: { status: "VERIFIED" } }),
      prisma.order.findMany({ where: { status: { not: "CANCELLED" } } }),
      prisma.entrepreneurProfile.count({ where: { status: "APPROVED" } }),
      prisma.entrepreneurProfile.count({
        where: { status: "APPROVED", appliedAt: { gte: startOfThisWeek } },
      }),
      prisma.product.count({ where: { status: "APPROVED" } }),
      prisma.category.findMany({
        include: {
          products: {
            where: { status: "APPROVED" },
            include: { orderItems: { include: { order: true } } },
          },
        },
      }),
    ]);

    const totalRevenue = verifiedOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // Compare this week's orders vs last week's, for the "+X% vs last week" labels.
    const thisWeekOrders = allOrders.filter((order) => order.createdAt >= startOfThisWeek);
    const lastWeekOrders = allOrders.filter(
      (order) => order.createdAt >= startOfLastWeek && order.createdAt < startOfThisWeek
    );
    const revenueThisWeek = thisWeekOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const revenueLastWeek = lastWeekOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const revenueChangePercent =
      revenueLastWeek > 0 ? ((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100 : 0;
    const orderCountChangePercent =
      lastWeekOrders.length > 0
        ? ((thisWeekOrders.length - lastWeekOrders.length) / lastWeekOrders.length) * 100
        : 0;

    // Revenue by category — sums up VERIFIED order line items per category.
    const categoryRevenue = categories
      .map((category) => {
        const revenue = category.products.reduce((sum, product) => {
          const productRevenue = product.orderItems
            .filter((item) => item.order.status === "VERIFIED")
            .reduce((itemSum, item) => itemSum + Number(item.unitPriceAtOrder) * item.quantity, 0);
          return sum + productRevenue;
        }, 0);
        return { category: category.name, revenue };
      })
      .filter((entry) => entry.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);

    // Last 6 months of verified revenue, for the trend line.
    const monthlyTrend: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthRevenue = verifiedOrders
        .filter((order) => order.createdAt >= monthStart && order.createdAt < monthEnd)
        .reduce((sum, order) => sum + Number(order.totalAmount), 0);
      monthlyTrend.push({
        month: monthStart.toLocaleDateString("en-US", { month: "short" }),
        revenue: monthRevenue,
      });
    }

    return NextResponse.json({
      totalRevenue,
      revenueChangePercent: Number(revenueChangePercent.toFixed(1)),
      totalOrders: allOrders.length,
      orderCountChangePercent: Number(orderCountChangePercent.toFixed(1)),
      activeEntrepreneurs: allEntrepreneurs,
      newEntrepreneursThisWeek,
      activeProducts,
      categoryRevenue,
      monthlyTrend,
    });
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json({ message: "Unable to load reports." }, { status: 500 });
  }
}
