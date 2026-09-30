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
    const period = params.get("period") || "month"; // "week" | "month" | "all"
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Number(params.get("pageSize")) || ITEMS_PER_PAGE;

    const now = new Date();
    const since =
      period === "week"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : period === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(0);

    const businesses = await prisma.business.findMany({
      include: {
        entrepreneurProfile: { include: { user: true } },
        orders: { where: { status: "VERIFIED", createdAt: { gte: since } } },
      },
    });

    const allRankings = businesses
      .map((business) => ({
        businessId: business.id,
        entrepreneurName: business.entrepreneurProfile.user.name,
        businessName: business.businessName,
        revenue: business.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
        orderCount: business.orders.length,
      }))
      .filter((entry) => entry.orderCount > 0)
      .sort((a, b) => b.revenue - a.revenue);

    // Podium (top 3) is always returned in full, regardless of page —
    // it's a fixed showcase, not something that should change as you
    // page through. Only the table below it (rank 4 onward) is
    // actually paginated.
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
    console.error("Get rankings error:", error);
    return NextResponse.json({ message: "Unable to load rankings." }, { status: 500 });
  }
}
