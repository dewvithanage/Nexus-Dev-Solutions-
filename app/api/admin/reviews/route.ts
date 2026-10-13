import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { pageQuery, parseSearchParams } from "@/lib/request-validation";

const listQuerySchema = z.object({ ...pageQuery() });

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { page, pageSize } = query.data;

    const totalCount = await prisma.review.count();
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { product: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      reviews,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    return handleRouteError(error, "Get reviews error", { fallback: "Unable to load reviews." });
  }
}
