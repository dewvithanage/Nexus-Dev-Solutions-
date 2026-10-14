import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";
import { publicProductWhere } from "@/lib/public-visibility";

const MAX_REVIEWS = 200;

// Public reviews for a publicly visible product, newest first.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    if (!idField.safeParse(productId).success) return jsonError(404, "Product not found.");

    const product = await prisma.product.findFirst({
      where: { id: productId, ...publicProductWhere },
      select: { id: true },
    });
    if (!product) return jsonError(404, "Product not found.");

    const [reviews, ratingGroups] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: "desc" },
        take: MAX_REVIEWS,
      }),
      prisma.review.groupBy({ by: ["rating"], where: { productId }, _count: true }),
    ]);

    // How many 5-star, 4-star, etc. reviews exist, for the bar chart.
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalReviews = 0;
    let ratingSum = 0;
    for (const group of ratingGroups) {
      breakdown[group.rating] = group._count;
      totalReviews += group._count;
      ratingSum += group.rating * group._count;
    }

    return NextResponse.json({
      reviews,
      summary: {
        totalReviews,
        averageRating: totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0,
        breakdown,
      },
    });
  } catch (error) {
    return handleRouteError(error, "Get reviews error", { fallback: "Unable to load reviews." });
  }
}
