import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { handleRouteError, jsonError } from "@/lib/api-auth";
import { parseSearchParams } from "@/lib/request-validation";

const MAX_NOTIFICATIONS = 100;

const listQuerySchema = z.object({
  type: z.string().trim().regex(/^[A-Z_]{1,40}$/, "Invalid notification type.").optional(),
});

// Every signed-in user (admin or entrepreneur) only ever sees their own
// notifications: the user id comes from the session, never the request.
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Not authenticated.");

    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { type } = query.data;

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, ...(type && { type }) },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    });

    const unreadCounts = await prisma.notification.groupBy({
      by: ["type"],
      where: { userId: user.id, isRead: false },
      _count: true,
    });

    return NextResponse.json({ notifications, unreadCounts });
  } catch (error) {
    return handleRouteError(error, "Get notifications error", { fallback: "Unable to load notifications." });
  }
}

// Marks ALL of the current user's notifications as read — "Mark all as
// read" in the Figma. Marking just one happens via PATCH on the item route.
export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Not authenticated.");

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ message: "All notifications marked as read." });
  } catch (error) {
    return handleRouteError(error, "Mark all notifications read error", {
      fallback: "Unable to update notifications.",
    });
  }
}
