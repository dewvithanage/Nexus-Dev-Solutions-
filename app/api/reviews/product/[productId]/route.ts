import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;

    // Count how many 5-star, 4-star, etc. reviews exist, for the bar chart.
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const review of reviews) {
      breakdown[review.rating] = (breakdown[review.rating] || 0) + 1;
    }

    return NextResponse.json({
      reviews,
      summary: {
        totalReviews,
        averageRating: Number(averageRating.toFixed(1)),
        breakdown,
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json({ message: "Unable to load reviews." }, { status: 500 });
  }
}
