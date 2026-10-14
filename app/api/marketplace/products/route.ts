import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleRouteError } from "@/lib/api-auth";
import { pageQuery, parseSearchParams } from "@/lib/request-validation";
import { publicProductWhere } from "@/lib/public-visibility";

const PRODUCTS_PER_PAGE = 4;

const listQuerySchema = z
  .object({
    q: z.string().trim().max(100, "Search text is too long.").optional(),
    category: z.string().trim().max(100).optional(),
    minPrice: z.coerce.number({ invalid_type_error: "minPrice must be a number." }).min(0).optional(),
    maxPrice: z.coerce.number({ invalid_type_error: "maxPrice must be a number." }).min(0).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).default("newest"),
    featured: z.enum(["true", "false"]).optional(),
    ...pageQuery(PRODUCTS_PER_PAGE, 48),
  })
  .refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
    message: "minPrice can't be more than maxPrice.",
  });

// Public product search. Separate from /api/products (an entrepreneur's own
// products): this one only ever returns publicly visible products, and
// supports search text, category, price range, sort order and pagination.
export async function GET(request: NextRequest) {
  try {
    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { q, category, minPrice, maxPrice, sort, featured, page, pageSize } = query.data;

    const where: Prisma.ProductWhereInput = { ...publicProductWhere };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      };
    }

    // The rating is stored on each product (kept up to date when reviews
    // change), so "Best Rating" is sorted by the database across all pages,
    // not just within the current page.
    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      sort === "price_asc"
        ? [{ price: "asc" }]
        : sort === "price_desc"
        ? [{ price: "desc" }]
        : sort === "rating"
        ? [{ ratingAverage: "desc" }, { ratingCount: "desc" }]
        : [{ createdAt: "desc" }];

    const include = {
      images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
      business: { select: { businessName: true } },
    };

    // The Home page's "featured" strip: up to 4 of the best-rated products
    // with an average of 4 stars or more.
    if (featured === "true") {
      const products = await prisma.product.findMany({
        where: { ...where, ratingCount: { gt: 0 }, ratingAverage: { gte: 4 } },
        orderBy: [{ ratingAverage: "desc" }, { ratingCount: "desc" }],
        take: 4,
        include,
      });
      return NextResponse.json({ products: products.map(mapProduct) });
    }

    const totalCount = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const products = await prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include,
    });

    return NextResponse.json({
      products: products.map(mapProduct),
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    return handleRouteError(error, "Get marketplace products error", { fallback: "Unable to load products." });
  }
}

function mapProduct(product: {
  id: string;
  name: string;
  price: Prisma.Decimal;
  ratingAverage: number;
  ratingCount: number;
  createdAt: Date;
  images: { url: string }[];
  business: { businessName: string };
}) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    imageUrl: product.images[0]?.url ?? null,
    businessName: product.business.businessName,
    averageRating: product.ratingCount > 0 ? Number(product.ratingAverage.toFixed(1)) : null,
    reviewCount: product.ratingCount,
    createdAt: product.createdAt,
  };
}
