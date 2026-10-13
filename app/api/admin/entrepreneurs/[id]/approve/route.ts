import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";
import { sendApplicationApprovedEmail } from "@/lib/email";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Entrepreneur not found.");

    const current = await prisma.entrepreneurProfile.findUnique({
      where: { id },
      select: { status: true, user: { select: { name: true, email: true } } },
    });
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

    // Pending entrepreneurs can't use the dashboard yet, so they're also told
    // by email. Sent after the approval is saved; if email fails, the
    // approval still stands and the admin is told the email wasn't sent.
    let emailSent = true;
    try {
      await sendApplicationApprovedEmail(current.user.email, current.user.name);
    } catch (error) {
      emailSent = false;
      console.warn("Approval email not sent:", error);
    }

    return NextResponse.json({
      message: emailSent
        ? "Entrepreneur approved and notified by email."
        : "Entrepreneur approved. The email couldn't be sent, but they'll see an in-app notification when they sign in.",
      emailSent,
      entrepreneur,
    });
  } catch (error) {
    return handleRouteError(error, "Approve entrepreneur error", {
      notFound: "Entrepreneur not found.",
      fallback: "Unable to approve entrepreneur.",
    });
  }
}
