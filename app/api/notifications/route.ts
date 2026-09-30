import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const typeFilter = request.nextUrl.searchParams.get("type");

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, ...(typeFilter && { type: typeFilter }) },
      orderBy: { createdAt: "desc" },
    });

    const unreadCounts = await prisma.notification.groupBy({
      by: ["type"],
      where: { userId: user.id, isRead: false },
      _count: true,
    });

    return NextResponse.json({ notifications, unreadCounts });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ message: "Unable to load notifications." }, { status: 500 });
  }
}

// Marks ALL of the current user's notifications as read — "Mark all as
// read" in the Figma. Marking just one happens via PATCH on the item
// route instead (app/api/notifications/[id]/route.ts).
export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json({ message: "Unable to update notifications." }, { status: 500 });
  }
}
