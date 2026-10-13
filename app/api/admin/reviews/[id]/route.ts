import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";
import { refreshProductRating } from "@/lib/ratings";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Review not found.");

    await prisma.$transaction(async (tx) => {
      const review = await tx.review.delete({ where: { id } });
      await refreshProductRating(tx, review.productId);
    });

    return NextResponse.json({ message: "Review removed." });
  } catch (error) {
    return handleRouteError(error, "Delete review error", {
      notFound: "Review not found.",
      fallback: "Unable to remove review.",
    });
  }
}
