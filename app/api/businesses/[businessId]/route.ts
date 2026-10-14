import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";
import { publicBusinessWhere, publicProductWhere } from "@/lib/public-visibility";

// Public storefront. Only shown once an admin has approved the
// entrepreneur; a pending or rejected business gets 404, as if it didn't
// exist. Different from /api/entrepreneurs/me, which is the signed-in
// entrepreneur's own (private) view.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    if (!idField.safeParse(businessId).success) return jsonError(404, "Business not found.");

    const business = await prisma.business.findFirst({
      where: { id: businessId, ...publicBusinessWhere },
      select: {
        id: true,
        businessName: true,
        description: true,
        logoUrl: true,
        entrepreneurProfile: {
          select: { university: true, bio: true, whatsappNumber: true, user: { select: { name: true } } },
        },
        products: {
          where: publicProductWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            price: true,
            ratingAverage: true,
            ratingCount: true,
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
    });

    if (!business) {
      return jsonError(404, "Business not found.");
    }

    return NextResponse.json({
      business: {
        id: business.id,
        businessName: business.businessName,
        description: business.description,
        logoUrl: business.logoUrl,
        entrepreneurName: business.entrepreneurProfile.user.name,
        university: business.entrepreneurProfile.university,
        bio: business.entrepreneurProfile.bio,
        whatsappNumber: business.entrepreneurProfile.whatsappNumber,
      },
      products: business.products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.images[0]?.url ?? null,
        averageRating: product.ratingCount > 0 ? Number(product.ratingAverage.toFixed(1)) : null,
        reviewCount: product.ratingCount,
      })),
    });
  } catch (error) {
    return handleRouteError(error, "Get business storefront error", { fallback: "Unable to load business." });
  }
}
