import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { saveUploadedFile } from "@/lib/upload";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("image");
    const caption = formData.get("caption") as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "No image provided." }, { status: 400 });
    }

    const url = await saveUploadedFile(file, "gallery");

    const galleryItem = await prisma.galleryItem.create({
      data: { imageUrl: url, caption, uploadedById: admin.id },
    });

    return NextResponse.json({ message: "Image added to gallery.", galleryItem }, { status: 201 });
  } catch (error) {
    console.error("Upload gallery image error:", error);
    return NextResponse.json({ message: "Unable to upload image." }, { status: 500 });
  }
}
