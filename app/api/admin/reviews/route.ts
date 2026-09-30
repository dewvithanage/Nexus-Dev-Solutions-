import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const ITEMS_PER_PAGE = 10;

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Number(params.get("pageSize")) || ITEMS_PER_PAGE;

    const totalCount = await prisma.review.count();
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { product: true },
    });

    return NextResponse.json({
      reviews,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json({ message: "Unable to load reviews." }, { status: 500 });
  }
}
