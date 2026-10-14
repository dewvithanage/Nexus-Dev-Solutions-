import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { pageQuery, parseFormBody, parseSearchParams } from "@/lib/request-validation";
import { UploadValidationError } from "@/lib/upload";

const ITEMS_PER_PAGE = 10;

const listQuerySchema = z
  .object({
    ...pageQuery(ITEMS_PER_PAGE),
  })
  .strict();

// Only the image and an optional caption are accepted. Who uploaded it is
// taken from the session, so a field like "uploadedById" is rejected.
const uploadSchema = z
  .object({
    image: z.instanceof(File, { message: "An image file is required." }),
    caption: z
      .string()
      .trim()
      .max(200, "Caption must be at most 200 characters.")
      .optional()
      .transform((value) => (value ? value : null)),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, listQuerySchema);
    if (query.error) return query.error;
    const { page, pageSize } = query.data;

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
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const parsed = await parseFormBody(request, uploadSchema);
    if (parsed.error) return parsed.error;
    const { image, caption } = parsed.data;

    const { saveUploadedFile } = await import("@/lib/upload");
    const imageUrl = await saveUploadedFile(image, "gallery");

    const item = await prisma.galleryItem.create({
      // uploadedById is required by the GalleryItem table (which admin uploaded
      // it). It comes from the signed-in session, never from the request.
      data: { imageUrl, caption, uploadedById: auth.admin.id },
    });

    return NextResponse.json({ message: "Image uploaded.", item }, { status: 201 });
  } catch (error) {
    // Wrong file type, empty or too large: the user's mistake, not a server error.
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Upload gallery image error:", error);
    return NextResponse.json({ message: "Unable to upload image." }, { status: 500 });
  }
}
