import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const ITEMS_PER_PAGE = 10;

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const tab = params.get("tab") || "ACTIVE"; // "ACTIVE" | "REJECTED"
    const search = params.get("search")?.trim();
    const category = params.get("category");
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Number(params.get("pageSize")) || ITEMS_PER_PAGE;

    const where: Prisma.ProductWhereInput = {
      status: tab === "REJECTED" ? "REJECTED" : { not: "REJECTED" },
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
        category: true,
        images: true,
        reviews: true,
        orderItems: true,
        business: { include: { entrepreneurProfile: { include: { user: true } } } },
      },
    });

    const products = rows.map((product) => {
      const averageRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
          : null;

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
        salesCount: product.orderItems.length,
        createdAt: product.createdAt,
      };
    });

    return NextResponse.json({
      products,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json({ message: "Unable to load products." }, { status: 500 });
  }
}
