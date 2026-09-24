import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const PRODUCTS_PER_PAGE = 4;

// This is deliberately a SEPARATE route from /api/products (which is for
// a logged-in entrepreneur's own products). This one is public, only ever
// returns APPROVED products, and supports the filters the public pages
// need: search text, category, price range, sort order, and now proper
// pagination (page number, page size, total count, total pages) instead
// of just capping at a fixed number of results.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const search = params.get("q");
    const categorySlug = params.get("category");
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const sort = params.get("sort"); // "price_asc" | "price_desc" | "newest" | "rating"
    const featured = params.get("featured"); // "true" -> only highly-rated, for the Home page
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Number(params.get("pageSize")) || PRODUCTS_PER_PAGE;

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

    // The Home page's "featured=true" request doesn't paginate — it
    // always wants a small, fixed set of top-rated products, computed
    // below after loading. Everything else (the actual Marketplace
    // browsing) uses real page/skip-based pagination.
    if (featured === "true") {
      const products = await prisma.product.findMany({
        where,
        orderBy,
        take: 8,
        include: { images: true, reviews: true, business: true },
      });

      let results = products.map(mapProduct);
      results = results
        .filter((product) => (product.averageRating ?? 0) >= 4)
        .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
        .slice(0, 4);

      return NextResponse.json({ products: results });
    }

    const totalCount = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { images: true, reviews: true, business: true },
    });

    let results = products.map(mapProduct);

    // "rating" sort has to happen after loading, since it's a computed
    // value (average of Reviews), not a real database column to sort by.
    // Note: this only sorts within the current page's results, which is
    // an accepted trade-off — a fully accurate global rating sort would
    // need every product's rating computed before paginating.
    if (sort === "rating") {
      results = results.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    }

    return NextResponse.json({
      products: results,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    console.error("Get marketplace products error:", error);
    return NextResponse.json({ message: "Unable to load products." }, { status: 500 });
  }
}

function mapProduct(product: Prisma.ProductGetPayload<{ include: { images: true; reviews: true; business: true } }>) {
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
}
