import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
          include: { 
            entrepreneurProfile: { 
              include: { user: true } 
            } 
          },
        },
      },
    });

    const results = products.map((product) => {
      const reviews = product.reviews || [];
      const orderItems = product.orderItems || [];

      const averageRating =
        reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : null;
      
      const salesCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        status: product.status,
        category: product.category?.name ?? "Uncategorized",
        imageUrl: product.images?.[0]?.url ?? null,
        entrepreneurName: product.business?.entrepreneurProfile?.user?.name ?? "Unknown",
        university: product.business?.entrepreneurProfile?.university ?? null,
        averageRating: averageRating ? Number(averageRating.toFixed(1)) : null,
        salesCount,
        createdAt: product.createdAt,
      };
    });

    return NextResponse.json({ products: results });
  } catch (error) {
    console.error("Get admin products error:", error);
    return NextResponse.json({ products: [], message: "Unable to load products." }, { status: 500 });
  }
}