import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { revalidateAfterModeration } from "@/lib/admin/revalidate";
import { idField, optionalText, parseOptionalJsonBody } from "@/lib/request-validation";

const rejectSchema = z
  .object({ rejectionReason: optionalText(500, "Rejection reason") })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Product not found.");

    // The quick-reject button sends no body, so an empty body is allowed.
    const parsed = await parseOptionalJsonBody(request, rejectSchema);
    if (parsed.error) return parsed.error;
    const { rejectionReason } = parsed.data;

    const current = await prisma.product.findUnique({ where: { id }, select: { status: true } });
    if (!current) return jsonError(404, "Product not found.");
    if (current.status === "REJECTED") return jsonError(409, "This product is already rejected.");

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedById: auth.admin.id,
          rejectionReason,
        },
        // Product only stores which business owns it; the chain to the
        // entrepreneur's user is what tells us who to notify.
        include: { business: { include: { entrepreneurProfile: true } } },
      });

      // Without this, the entrepreneur would only find out by checking
      // Submission Status manually.
      await tx.notification.create({
        data: {
          userId: updated.business.entrepreneurProfile.userId,
          type: "PRODUCT",
          title: "Product Submission Rejected",
          message: rejectionReason
            ? `"${updated.name}" was not approved: ${rejectionReason}`
            : `"${updated.name}" was not approved this time.`,
          relatedEntityType: "Product",
          relatedEntityId: updated.id,
        },
      });

      return updated;
    });

    revalidateAfterModeration();

    return NextResponse.json({ message: "Product rejected.", product });
  } catch (error) {
    return handleRouteError(error, "Reject product error", {
      notFound: "Product not found.",
      fallback: "Unable to reject product.",
    });
  }
}
