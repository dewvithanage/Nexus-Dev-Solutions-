import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { pageQuery, parseSearchParams } from "@/lib/request-validation";

const listQuerySchema = z.object({
  // Product Management uses tabs (ACTIVE = everything not rejected); the
  // Product Approval queue filters by one exact status instead.
  tab: z.enum(["ACTIVE", "REJECTED"]).default("ACTIVE"),
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]).optional(),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  ...pageQuery(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { tab, status, search, category, page, pageSize } = query.data;

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

    const totalCount = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const rows = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { orderItems: true } },
        business: {
          select: {
            entrepreneurProfile: { select: { university: true, user: { select: { name: true } } } },
          },
        },
      },
    });

    const products = rows.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      status: product.status,
      category: product.category.name,
      imageUrl: product.images[0]?.url ?? null,
      entrepreneurName: product.business.entrepreneurProfile.user.name,
      university: product.business.entrepreneurProfile.university,
      averageRating: product.ratingCount > 0 ? Number(product.ratingAverage.toFixed(1)) : null,
      salesCount: product._count.orderItems,
      createdAt: product.createdAt,
    }));

    return NextResponse.json({
      products,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    return handleRouteError(error, "Get products error", { fallback: "Unable to load products." });
  }
}
