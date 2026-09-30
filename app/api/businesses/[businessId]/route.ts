import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public — anyone can view a business's storefront page, no login needed.
// This is different from /api/entrepreneurs/me (which requires the
// entrepreneur to be logged in and only shows their OWN business).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        entrepreneurProfile: { include: { user: true } },
        products: {
          where: { status: "APPROVED" },
          include: { images: true, reviews: true, category: true },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ message: "Business not found." }, { status: 404 });
    }

    const products = business.products.map((product) => {
      const averageRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : null;

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.images[0]?.url ?? null,
        averageRating: averageRating ? Number(averageRating.toFixed(1)) : null,
        reviewCount: product.reviews.length,
      };
    });

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
      products,
    });
  } catch (error) {
    console.error("Get business storefront error:", error);
    return NextResponse.json({ message: "Unable to load business." }, { status: 500 });
  }
}
