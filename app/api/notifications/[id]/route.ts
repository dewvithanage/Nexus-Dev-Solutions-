import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { handleRouteError, jsonError } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Not authenticated.");

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Notification not found.");

    // updateMany with the owner in the filter: someone else's notification
    // simply matches nothing and gets the same 404 as a missing one.
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true },
    });
    if (result.count === 0) return jsonError(404, "Notification not found.");

    return NextResponse.json({ message: "Marked as read." });
  } catch (error) {
    return handleRouteError(error, "Mark notification read error", { fallback: "Unable to update notification." });
  }
}
