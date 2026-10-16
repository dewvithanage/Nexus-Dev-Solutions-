import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { revalidateAfterModeration } from "@/lib/admin/revalidate";
import { idField } from "@/lib/request-validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Product not found.");

    const current = await prisma.product.findUnique({
      where: { id },
      select: { status: true, business: { select: { entrepreneurProfile: { select: { status: true } } } } },
    });
    if (!current) return jsonError(404, "Product not found.");
    if (current.status === "APPROVED") return jsonError(409, "This product is already approved.");
    // A product only goes live if its seller is approved too.
    if (current.business.entrepreneurProfile.status !== "APPROVED") {
      return jsonError(409, "Approve the entrepreneur's registration before approving their products.");
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedById: auth.admin.id,
          rejectionReason: null,
        },
        include: { business: { include: { entrepreneurProfile: true } } },
      });

      await tx.notification.create({
        data: {
          userId: updated.business.entrepreneurProfile.userId,
          type: "PRODUCT",
          title: "Your Product Has Been Approved!",
          message: `"${updated.name}" was successfully reviewed and is now live in the student catalog.`,
          relatedEntityType: "Product",
          relatedEntityId: updated.id,
        },
      });

      return updated;
    });

    revalidateAfterModeration();

    return NextResponse.json({ message: "Product approved and published.", product });
  } catch (error) {
    return handleRouteError(error, "Approve product error", {
      notFound: "Product not found.",
      fallback: "Unable to approve product.",
    });
  }
}
