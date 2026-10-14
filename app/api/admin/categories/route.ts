import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { parseJsonBody, parseSearchParams, requiredText } from "@/lib/request-validation";
import { slugify } from "@/lib/slug";
import { categoriesQuerySchema, getCategoriesList } from "@/lib/admin/content";

const createSchema = z.object({ name: requiredText(60, "Category name") }).strict();

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, categoriesQuerySchema);
    if (query.error) return query.error;

    return NextResponse.json(await getCategoriesList(query.data));
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
