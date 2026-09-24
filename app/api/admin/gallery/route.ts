import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/upload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File || formData.get("file") as File;
    const caption = formData.get("caption") as string || formData.get("title") as string || "";

    if (!file) {
      return NextResponse.json({ success: false, message: "No image file provided." }, { status: 400 });
    }

    // Save file to public/uploads/gallery
    const imageUrl = await saveFile(file, "gallery");

    // Get an admin user as the uploader (fallback for database relation)
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminUser) {
      return NextResponse.json({ success: false, message: "Admin user not found." }, { status: 400 });
    }

    // Create gallery item in database
    const galleryItem = await prisma.galleryItem.create({
      data: {
        imageUrl,
        caption,
        uploadedById: adminUser.id,
      },
    });

    return NextResponse.json({ success: true, galleryItem });
  } catch (error) {
    console.error("Gallery upload API error:", error);
    return NextResponse.json({ success: false, message: "Failed to save image." }, { status: 500 });
  }
}