import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJsonBody, requireEntrepreneur } from "@/lib/api";
import { productUpdateSchema } from "@/lib/schemas";

// Separate from the PUBLIC /api/products/[productId] route (which only
// ever returns APPROVED products). This one is for the entrepreneur
// managing their OWN product regardless of its status — needed for Edit
// Product and Product Submission Status to show pending/rejected items.
//
// Someone else's product gets 404, exactly like a product that does not
// exist, so changing the id in the URL reveals nothing about other shops.
async function verifyOwnership(productId: string) {
  const auth = await requireEntrepreneur();
  if (auth.error) return { error: auth.error };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
  });

  if (!product || product.businessId !== auth.business.id) {
    return { error: jsonError("Product not found.", 404) };
  }

  return { product };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const result = await verifyOwnership(productId);
    if (result.error) return result.error;

    return NextResponse.json({ product: result.product });
  } catch (error) {
    console.error("Get own product error:", error);
    return NextResponse.json({ message: "Unable to load product." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const result = await verifyOwnership(productId);
    if (result.error) return result.error;

    // Price must be > 0 with at most 2 decimals, stock a whole number
    // >= 0, and so on (lib/schemas.ts). This is the authoritative check:
    // the edit form checks too, but only for a faster message, since a
    // request can always be sent directly (bypassing the UI). Fields like
    // status, businessId or rejectionReason are rejected with 400.
    const parsed = await parseJsonBody(request, productUpdateSchema);
    if (parsed.error) return parsed.error;

    const {
      name,
      categoryId,
      description,
      price,
      stockQuantity,
      tags,
      onCampusPickup,
      areaDropOff,
      postingEnabled,
    } = parsed.data;

    if (categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) {
        return jsonError("The selected category does not exist.", 400);
      }
    }

    // Editing a rejected product and saving puts it back into the review
    // queue — that's what "Resubmit" means on the Submission Status page.
    // An already-approved product edited here goes back to PENDING too,
    // since an admin should see the changed version before it's public
    // again (prevents silently changing an approved listing's price/
    // description without any review).
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        categoryId,
        description,
        price,
        stockQuantity,
        tags,
        onCampusPickup,
        areaDropOff,
        postingEnabled,
        status: "PENDING",
        rejectionReason: null,
      },
    });

    return NextResponse.json({ message: "Product updated and resubmitted for review.", product });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ message: "Unable to update product." }, { status: 500 });
  }
}
