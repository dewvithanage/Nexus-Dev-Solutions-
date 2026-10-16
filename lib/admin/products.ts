import { cache } from "react";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pageQuery } from "@/lib/request-validation";

// Data for Product Management, Product Approval and Admin Product Details,
// shared by the Server Component pages and the /api/admin/products routes.

export const productListQuerySchema = z.object({
  // Product Management uses tabs (ACTIVE = everything not rejected); the
  // Product Approval queue filters by one exact status instead.
  tab: z.enum(["ACTIVE", "REJECTED"]).default("ACTIVE"),
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]).optional(),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  ...pageQuery(),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export async function getProductList({ tab, status, search, category, page, pageSize }: ProductListQuery) {
  const where: Prisma.ProductWhereInput = {
    status: status ?? (tab === "REJECTED" ? "REJECTED" : { not: "REJECTED" }),
  };

  if (category && category !== "All") {
    where.category = { name: category };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { business: { entrepreneurProfile: { user: { name: { contains: search, mode: "insensitive" } } } } },
    ];
  }

  const [totalCount, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        price: true,
        status: true,
        ratingAverage: true,
        ratingCount: true,
        createdAt: true,
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        _count: { select: { orderItems: true } },
        business: {
          select: {
            entrepreneurProfile: { select: { university: true, user: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  // Plain numbers and ISO strings, so this can be sent as JSON or passed
  // from a Server Component to a Client Component.
  const products = rows.map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    status: product.status,
    category: product.category.name,
    imageUrl: product.images[0]?.url ?? null,
    entrepreneurName: product.business.entrepreneurProfile.user.name,
    university: product.business.entrepreneurProfile.university,
    averageRating: product.ratingCount > 0 ? Number(product.ratingAverage.toFixed(1)) : null,
    salesCount: product._count.orderItems,
    createdAt: product.createdAt.toISOString(),
  }));

  return {
    products,
    pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), totalCount, pageSize },
  };
}

export type ProductList = Awaited<ReturnType<typeof getProductList>>;
export type ProductRow = ProductList["products"][number];

// Admin only. The seller's display details, never the whole User row.
//
// cache(): the page and its generateMetadata share one query per request.
export const getProductDetails = cache(async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stockQuantity: true,
      status: true,
      rejectionReason: true,
      adminNotes: true,
      createdAt: true,
      reviewedAt: true,
      category: { select: { id: true, name: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
      business: {
        select: {
          businessName: true,
          entrepreneurProfile: { select: { university: true, user: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!product) return null;

  return {
    ...product,
    price: Number(product.price),
    createdAt: product.createdAt.toISOString(),
    reviewedAt: product.reviewedAt?.toISOString() ?? null,
  };
});

export type ProductDetails = NonNullable<Awaited<ReturnType<typeof getProductDetails>>>;

// For the "move to another category" dropdown on Admin Product Details.
export function getCategoryOptions() {
  return prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export type CategoryOption = Awaited<ReturnType<typeof getCategoryOptions>>[number];
