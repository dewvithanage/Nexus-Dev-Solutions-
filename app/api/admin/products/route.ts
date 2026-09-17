import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Shared by TWO admin pages, same idea as /api/admin/entrepreneurs:
//   - Product Approval (?status=PENDING)
//   - Product Management (no filter = every product)
export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const validStatuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];
    const where =
      statusParam && validStatuses.includes(statusParam)
        ? { status: statusParam as "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" }
        : {};

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        images: true,
        reviews: true,
        orderItems: true,
        business: {
          include: { entrepreneurProfile: { include: { user: true } } },
        },
      },
    });

    const results = products.map((product) => {
      const averageRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : null;
      const salesCount = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        status: product.status,
        category: product.category.name,
        imageUrl: product.images[0]?.url ?? null,
        entrepreneurName: product.business.entrepreneurProfile.user.name,
        university: product.business.entrepreneurProfile.university,
        averageRating: averageRating ? Number(averageRating.toFixed(1)) : null,
        salesCount,
        createdAt: product.createdAt,
      };
    });

    return NextResponse.json({ products: results });
  } catch (error) {
    console.error("Get admin products error:", error);
    return NextResponse.json({ message: "Unable to load products." }, { status: 500 });
  }
}
