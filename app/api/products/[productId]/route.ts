import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public product detail lookup — used by the Product Details page, and by
// the Review pages to show which product a review is for. Only APPROVED
// products are shown publicly; PENDING/REJECTED ones are only visible to
// their own entrepreneur (via GET /api/products) or an admin.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;

    const product = await prisma.product.findFirst({
      where: { id: productId, status: "APPROVED" },
      include: {
        category: true,
        images: true,
        business: {
          include: { entrepreneurProfile: { include: { user: true } } },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json({ message: "Unable to load product." }, { status: 500 });
  }
}
