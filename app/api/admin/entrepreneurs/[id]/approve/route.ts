import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Entrepreneur not found.");

    const current = await prisma.entrepreneurProfile.findUnique({ where: { id }, select: { status: true } });
    if (!current) return jsonError(404, "Entrepreneur not found.");
    // Pending or previously rejected applications can be approved; approving
    // twice would only send a duplicate notification.
    if (current.status === "APPROVED") return jsonError(409, "This entrepreneur is already approved.");

    // Status change and notification succeed or fail together.
    const entrepreneur = await prisma.$transaction(async (tx) => {
      const updated = await tx.entrepreneurProfile.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedById: auth.admin.id,
          rejectionReason: null,
        },
      });

      await tx.notification.create({
        data: {
          userId: updated.userId,
          type: "SYSTEM",
          title: "Your Registration Has Been Approved!",
          message: "You can now add products and start selling on StartupSpark.",
          relatedEntityType: "EntrepreneurProfile",
          relatedEntityId: updated.id,
        },
      });

      return updated;
    });

    return NextResponse.json({ message: "Entrepreneur approved.", entrepreneur });
  } catch (error) {
    return handleRouteError(error, "Approve entrepreneur error", {
      notFound: "Entrepreneur not found.",
      fallback: "Unable to approve entrepreneur.",
    });
  }
}
