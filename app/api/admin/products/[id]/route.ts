import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField, parseJsonBody } from "@/lib/request-validation";

const changeCategorySchema = z.object({ categoryId: idField }).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Product not found.");

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        business: {
          include: {
            entrepreneurProfile: {
              // Only the seller's display details. Never the whole User row.
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    if (!product) {
      return jsonError(404, "Product not found.");
    }

    return NextResponse.json({ product });
  } catch (error) {
    return handleRouteError(error, "Get product details error", { fallback: "Unable to load product." });
  }
}

// Admin changes a product's category directly. This exists mainly so an
// admin can move a product out of a category that needs deleting
// (Category Management blocks deletion while any product still uses it).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Product not found.");

    const parsed = await parseJsonBody(request, changeCategorySchema);
    if (parsed.error) return parsed.error;
    const { categoryId } = parsed.data;

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return jsonError(400, "That category doesn't exist.");
    }

    const product = await prisma.product.update({
      where: { id },
      data: { categoryId },
      include: { category: true },
    });

    return NextResponse.json({ message: "Category updated.", product });
  } catch (error) {
    return handleRouteError(error, "Change product category error", {
      notFound: "Product not found.",
      fallback: "Unable to update category.",
    });
  }
}

// Permanently delete a product.
//
// SAFETY CHECK: a product that has ever been ordered has OrderItem records,
// which feed into Rankings and Reports. Deleting it would corrupt real sales
// history, so deletion is blocked if any order has ever included it. The
// admin should reject it instead, which hides it from the marketplace.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Product not found.");

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { orderItems: true } } },
    });

    if (!product) {
      return jsonError(404, "Product not found.");
    }

    if (product._count.orderItems > 0) {
      return jsonError(
        409,
        `Cannot delete "${product.name}" — it has ${product._count.orderItems} order(s) in its history. Deleting it would corrupt real sales records and revenue reports. Reject it instead if you want to hide it from the marketplace.`
      );
    }

    // Reviews aren't linked to Rankings/Reports, so they're removed with it.
    // ProductImage rows cascade automatically (onDelete: Cascade).
    await prisma.$transaction([
      prisma.review.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Product permanently deleted." });
  } catch (error) {
    return handleRouteError(error, "Delete product error", {
      notFound: "Product not found.",
      fallback: "Unable to delete product.",
    });
  }
}
