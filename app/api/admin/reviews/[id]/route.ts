import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.review.delete({ where: { id } });

    return NextResponse.json({ message: "Review removed." });
  } catch (error) {
    console.error("Delete review error:", error);
    return NextResponse.json({ message: "Unable to remove review." }, { status: 500 });
  }
}
