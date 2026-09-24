import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public product detail lookup.
// Only APPROVED products are shown publicly.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "APPROVED",
      },
      include: {
        category: true,
        images: true,
        reviews: true,
        business: {
          include: {
            entrepreneurProfile: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 }
      );
    }

    const averageRating =
      product.reviews.length > 0
        ? product.reviews.reduce(
            (sum, review) => sum + review.rating,
            0
          ) / product.reviews.length
        : null;

    return NextResponse.json({
      product: {
        ...product,
        averageRating:
          averageRating !== null
            ? Number(averageRating.toFixed(1))
            : null,
        reviewCount: product.reviews.length,
      },
    });
  } catch (error) {
    console.error("Get product error:", error);

    return NextResponse.json(
      { message: "Unable to load product." },
      { status: 500 }
    );
  }
}