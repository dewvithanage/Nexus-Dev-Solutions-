import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";
import { publicProductWhere } from "@/lib/public-visibility";

// Public product detail. Only publicly visible products are shown, and only
// the fields the product page needs: never admin notes, review metadata or
// the seller's account details.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    if (!idField.safeParse(productId).success) return jsonError(404, "Product not found.");

    const product = await prisma.product.findFirst({
      where: { id: productId, ...publicProductWhere },
      select: {
        id: true,
        businessId: true,
        name: true,
        description: true,
        price: true,
        stockQuantity: true,
        tags: true,
        onCampusPickup: true,
        areaDropOff: true,
        postingEnabled: true,
        ratingAverage: true,
        ratingCount: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, sortOrder: true } },
        business: {
          select: {
            id: true,
            businessName: true,
            entrepreneurProfile: {
              select: {
                university: true,
                whatsappNumber: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return jsonError(404, "Product not found.");
    }

    const { ratingAverage, ratingCount, ...rest } = product;

    return NextResponse.json({
      product: {
        ...rest,
        averageRating: ratingCount > 0 ? Number(ratingAverage.toFixed(1)) : null,
        reviewCount: ratingCount,
      },
    });
  } catch (error) {
    return handleRouteError(error, "Get product error", { fallback: "Unable to load product." });
  }
}
