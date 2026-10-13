import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { pageQuery, parseJsonBody, parseSearchParams, requiredText } from "@/lib/request-validation";
import { slugify } from "@/lib/slug";

const listQuerySchema = z.object({ ...pageQuery() });
const createSchema = z.object({ name: requiredText(60, "Category name") }).strict();

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { page, pageSize } = query.data;

    const totalCount = await prisma.category.count();
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({
      categories,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    return handleRouteError(error, "Get categories error", { fallback: "Unable to load categories." });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = await parseJsonBody(request, createSchema);
    if (parsed.error) return parsed.error;
    const { name } = parsed.data;

    const slug = slugify(name);
    if (!slug) {
      return NextResponse.json({ message: "Category name must contain letters or numbers." }, { status: 400 });
    }

    const category = await prisma.category.create({ data: { name, slug } });

    return NextResponse.json({ message: "Category created.", category }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Create category error", {
      conflict: "A category with this name already exists.",
      fallback: "Unable to create category.",
    });
  }
}
