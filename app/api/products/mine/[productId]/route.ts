import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Separate from the PUBLIC /api/products/[productId] route (which only
// ever returns APPROVED products). This one is for the entrepreneur
// managing their OWN product regardless of its status — needed for Edit
// Product and Product Submission Status to show pending/rejected items.
async function verifyOwnership(productId: string) {
  const user = await getCurrentUser();
  const businessId = user?.entrepreneurProfile?.business?.id;

  if (!user || user.role !== "ENTREPRENEUR" || !businessId) {
    return { error: NextResponse.json({ message: "Unauthorized." }, { status: 401 }) };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true, category: true },
  });

  if (!product || product.businessId !== businessId) {
    return { error: NextResponse.json({ message: "Product not found." }, { status: 404 }) };
  }

  return { product };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const result = await verifyOwnership(productId);
  if (result.error) return result.error;

  return NextResponse.json({ product: result.product });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const result = await verifyOwnership(productId);
  if (result.error) return result.error;

  try {
    const body = await request.json();
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
    } = body as {
      name?: string;
      categoryId?: string;
      description?: string;
      price?: number;
      stockQuantity?: number;
      tags?: string[];
      onCampusPickup?: boolean;
      areaDropOff?: boolean;
      postingEnabled?: boolean;
    };

    // FIX: stockQuantity was previously written straight to the database
    // with no validation at all — negative numbers, decimals, and even
    // non-numeric values could all be saved. This is the authoritative
    // check: the frontend check below is just for a faster/friendlier
    // error message, but this is what actually protects the database,
    // since a request can always be sent directly (bypassing the UI).
    if (stockQuantity !== undefined) {
      if (
        typeof stockQuantity !== "number" ||
        Number.isNaN(stockQuantity) ||
        !Number.isInteger(stockQuantity) ||
        stockQuantity < 0
      ) {
        return NextResponse.json(
          { message: "Stock quantity must be a whole number greater than or equal to 0." },
          { status: 400 }
        );
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
        ...(name !== undefined && { name }),
        ...(categoryId !== undefined && { categoryId }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(stockQuantity !== undefined && { stockQuantity }),
        ...(tags !== undefined && { tags }),
        ...(onCampusPickup !== undefined && { onCampusPickup }),
        ...(areaDropOff !== undefined && { areaDropOff }),
        ...(postingEnabled !== undefined && { postingEnabled }),
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
