import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public listing of gallery images — admin uploads these (see Himasha's
// Admin Gallery Management page, Sprint 2). No auth needed to view.
export async function GET() {
  try {
    const galleryItems = await prisma.galleryItem.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ galleryItems });
  } catch (error) {
    console.error("Get gallery error:", error);
    return NextResponse.json({ message: "Unable to load gallery." }, { status: 500 });
  }
}
