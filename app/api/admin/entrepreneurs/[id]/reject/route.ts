import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { revalidateAfterModeration } from "@/lib/admin/revalidate";
import { idField, optionalText, parseOptionalJsonBody } from "@/lib/request-validation";
import { sendApplicationRejectedEmail } from "@/lib/email";

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
    if (!idField.safeParse(id).success) return jsonError(404, "Entrepreneur not found.");

    const parsed = await parseOptionalJsonBody(request, rejectSchema);
    if (parsed.error) return parsed.error;
    const { rejectionReason } = parsed.data;

    const current = await prisma.entrepreneurProfile.findUnique({
      where: { id },
      select: { status: true, user: { select: { name: true, email: true } } },
    });
    if (!current) return jsonError(404, "Entrepreneur not found.");
    if (current.status === "REJECTED") return jsonError(409, "This entrepreneur is already rejected.");

    const entrepreneur = await prisma.$transaction(async (tx) => {
      const updated = await tx.entrepreneurProfile.update({
        where: { id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedById: auth.admin.id,
          rejectionReason,
        },
      });

      // A rejected account can't sign in, so end any session it still has.
      await tx.user.update({
        where: { id: updated.userId },
        data: { sessionVersion: { increment: 1 } },
      });

      await tx.notification.create({
        data: {
          userId: updated.userId,
          type: "SYSTEM",
          title: "Registration Application Update",
          message: rejectionReason
            ? `Your application was not approved: ${rejectionReason}`
            : "Your application was not approved this time.",
          relatedEntityType: "EntrepreneurProfile",
          relatedEntityId: updated.id,
        },
      });

      return updated;
    });

    // A rejected account can't sign in to read an in-app notification, so
    // email is how they find out. Sent after the change is saved.
    let emailSent = true;
    try {
      await sendApplicationRejectedEmail(current.user.email, current.user.name, rejectionReason);
    } catch (error) {
      emailSent = false;
      console.warn("Rejection email not sent:", error);
    }

    revalidateAfterModeration();

    return NextResponse.json({
      message: emailSent
        ? "Entrepreneur rejected and notified by email."
        : "Entrepreneur rejected. The email couldn't be sent.",
      emailSent,
      entrepreneur,
    });
  } catch (error) {
    return handleRouteError(error, "Reject entrepreneur error", {
      notFound: "Entrepreneur not found.",
      fallback: "Unable to reject entrepreneur.",
    });
  }
}
