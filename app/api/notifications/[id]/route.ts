import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== user.id) {
      return NextResponse.json({ message: "Notification not found." }, { status: 404 });
    }

    await prisma.notification.update({ where: { id }, data: { isRead: true } });

    return NextResponse.json({ message: "Marked as read." });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return NextResponse.json({ message: "Unable to update notification." }, { status: 500 });
  }
}
