import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// This is deliberately a SEPARATE route from /api/products (which is for
// a logged-in entrepreneur's own products). This one is public, only ever
// returns APPROVED products, and supports the filters the public pages
// need: search text, category, price range, and sort order.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const search = params.get("q");
    const categorySlug = params.get("category");
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const sort = params.get("sort"); // "price_asc" | "price_desc" | "newest" | "rating"
    const featured = params.get("featured"); // "true" -> only highly-rated, for the Home page

    const where: Prisma.ProductWhereInput = { status: "APPROVED" };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price_asc"
        ? { price: "asc" }
        : sort === "price_desc"
        ? { price: "desc" }
        : { createdAt: "desc" }; // "newest" and the default

    const products = await prisma.product.findMany({
      where,
      orderBy,
      take: featured === "true" ? 8 : 60, // simple cap instead of full pagination for now
      include: {
        images: true,
        reviews: true,
        business: true,
      },
    });

    let results = products.map((product) => {
      const averageRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : null;

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.images[0]?.url ?? null,
        businessName: product.business.businessName,
        averageRating: averageRating ? Number(averageRating.toFixed(1)) : null,
        reviewCount: product.reviews.length,
        createdAt: product.createdAt,
      };
    });

    // "rating" sort has to happen after loading, since it's a computed
    // value (average of Reviews), not a real database column to sort by.
    if (sort === "rating") {
      results = results.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    }

    // For the Home page's "Trending" section: only show products that
    // actually have good reviews, not just whatever is newest.
    if (featured === "true") {
      results = results
        .filter((product) => (product.averageRating ?? 0) >= 4)
        .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
        .slice(0, 4);
    }

    return NextResponse.json({ products: results });
  } catch (error) {
    console.error("Get marketplace products error:", error);
    return NextResponse.json({ message: "Unable to load products." }, { status: 500 });
  }
}
