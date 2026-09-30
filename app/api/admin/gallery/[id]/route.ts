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
    await prisma.galleryItem.delete({ where: { id } });

    return NextResponse.json({ message: "Image removed from gallery." });
  } catch (error) {
    console.error("Delete gallery image error:", error);
    return NextResponse.json({ message: "Unable to remove image." }, { status: 500 });
  }
}
