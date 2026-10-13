import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireEntrepreneur } from "@/lib/api-auth";
import { idField, parseJsonBody } from "@/lib/request-validation";
import { updateProductSchema } from "@/lib/product-schema";

// Separate from the PUBLIC /api/products/[productId] route (which only ever
// returns APPROVED products). This one is for the entrepreneur managing
// their OWN product regardless of its status. Someone else's product gets
// the same 404 as a missing one, so ids can't be probed.
async function findOwnProduct(productId: string, businessId: string) {
  if (!idField.safeParse(productId).success) return null;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });
  return product && product.businessId === businessId ? product : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireEntrepreneur({ approvedOnly: false });
    if (auth.error) return auth.error;

    const { productId } = await params;
    const product = await findOwnProduct(productId, auth.business.id);
    if (!product) return jsonError(404, "Product not found.");

    return NextResponse.json({ product });
  } catch (error) {
    return handleRouteError(error, "Get own product error", { fallback: "Unable to load product." });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const { productId } = await params;
    const existing = await findOwnProduct(productId, auth.business.id);
    if (!existing) return jsonError(404, "Product not found.");

    const parsed = await parseJsonBody(request, updateProductSchema);
    if (parsed.error) return parsed.error;
    const changes = parsed.data;

    if (changes.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: changes.categoryId }, select: { id: true } });
      if (!category) return jsonError(400, "That category doesn't exist.");
    }

    // Any edit puts the product back into the review queue (that's what
    // "Resubmit" means on the Submission Status page), so an approved
    // listing can't be silently changed without an admin seeing it.
    const product = await prisma.product.update({
      where: { id: productId },
      data: { ...changes, status: "PENDING", rejectionReason: null },
    });

    return NextResponse.json({ message: "Product updated and resubmitted for review.", product });
  } catch (error) {
    return handleRouteError(error, "Update product error", {
      notFound: "Product not found.",
      fallback: "Unable to update product.",
    });
  }
}
