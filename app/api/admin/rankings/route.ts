import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get("period") || "month"; // "week" | "month" | "all"

    let sinceDate: Date | undefined;
    const now = new Date();
    if (period === "week") {
      sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      sinceDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    // "all" leaves sinceDate undefined — no date filter.

    const businesses = await prisma.business.findMany({
      include: {
        entrepreneurProfile: { include: { user: true } },
        products: { include: { reviews: true } },
        orders: {
          where: {
            status: "VERIFIED",
            ...(sinceDate && { createdAt: { gte: sinceDate } }),
          },
        },
      },
    });

    const ranked = businesses
      .map((business) => {
        const revenue = business.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const salesCount = business.orders.length;
        const allReviews = business.products.flatMap((product) => product.reviews);
        const averageRating =
          allReviews.length > 0
            ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
            : null;

        return {
          businessId: business.id,
          entrepreneurName: business.entrepreneurProfile.user.name,
          university: business.entrepreneurProfile.university,
          businessName: business.businessName,
          listedProducts: business.products.length,
          salesCount,
          revenue,
          averageRating: averageRating ? Number(averageRating.toFixed(1)) : null,
        };
      })
      // Only rank businesses that have actually made at least one verified sale.
      .filter((entry) => entry.salesCount > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return NextResponse.json({ rankings: ranked });
  } catch (error) {
    console.error("Get rankings error:", error);
    return NextResponse.json({ message: "Unable to load rankings." }, { status: 500 });
  }
}
