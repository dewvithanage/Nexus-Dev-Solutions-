import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField, parseJsonBody, requiredText } from "@/lib/request-validation";
import { slugify } from "@/lib/slug";

const renameSchema = z.object({ name: requiredText(60, "Category name") }).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Category not found.");

    const parsed = await parseJsonBody(request, renameSchema);
    if (parsed.error) return parsed.error;
    const { name } = parsed.data;

    const slug = slugify(name);
    if (!slug) return jsonError(400, "Category name must contain letters or numbers.");

    // The slug is part of the category's public URL, so it follows the name.
    const category = await prisma.category.update({ where: { id }, data: { name, slug } });

    return NextResponse.json({ message: "Category updated.", category });
  } catch (error) {
    return handleRouteError(error, "Update category error", {
      notFound: "Category not found.",
      conflict: "A category with this name already exists.",
      fallback: "Unable to update category.",
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Category not found.");

    // A category that still has products can't be deleted — they would be
    // left pointing at a category that no longer exists.
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return jsonError(409, `Can't delete — ${productCount} product(s) still use this category.`);
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ message: "Category deleted." });
  } catch (error) {
    return handleRouteError(error, "Delete category error", {
      notFound: "Category not found.",
      fallback: "Unable to delete category.",
    });
  }
}
