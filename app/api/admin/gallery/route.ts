import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const ITEMS_PER_PAGE = 10;

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Number(params.get("pageSize")) || ITEMS_PER_PAGE;

    const totalCount = await prisma.galleryItem.count();
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const items = await prisma.galleryItem.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items,
      pagination: { currentPage: page, totalPages, totalCount, pageSize },
    });
  } catch (error) {
    console.error("Get gallery error:", error);
    return NextResponse.json({ message: "Unable to load gallery." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ message: "An image file is required." }, { status: 400 });
    }

    const { saveUploadedFile } = await import("@/lib/upload");
    const imageUrl = await saveUploadedFile(file, "gallery");

    const item = await prisma.galleryItem.create({
      // uploadedById is required by the GalleryItem table (which admin uploaded
      // it). It comes from the signed-in session, never from the request.
      data: { imageUrl, caption: caption || null, uploadedById: admin.id },
    });

    return NextResponse.json({ message: "Image uploaded.", item });
  } catch (error) {
    console.error("Upload gallery image error:", error);
    return NextResponse.json({ message: "Unable to upload image." }, { status: 500 });
  }
}
