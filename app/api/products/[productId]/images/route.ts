import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireEntrepreneur } from "@/lib/api";
import { saveUploadedFile, UploadValidationError } from "@/lib/upload";

// Not exported: Next.js only allows HTTP handlers and route config to be
// exported from a route.ts file.
const MAX_PRODUCT_IMAGES = 4;

// Uploads up to 4 images for a product the logged-in entrepreneur owns.
// Called from the Add Product page right after the product itself is
// created (see Risk 6 in the architecture doc — this closes that gap).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const { productId } = await params;

    // Make sure this product actually belongs to the logged-in
    // entrepreneur's own business — otherwise anyone could attach images
    // to someone else's product just by guessing a product id.
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { businessId: true },
    });
    if (!product || product.businessId !== auth.business.id) {
      return jsonError("Product not found.", 404);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError("Send the images as multipart/form-data.", 400);
    }
    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return jsonError("No images were provided.", 400);
    }

    const existingCount = await prisma.productImage.count({ where: { productId } });
    const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - existingCount);

    if (remainingSlots === 0) {
      return jsonError(
        `This product already has the maximum of ${MAX_PRODUCT_IMAGES} images. Remove one first.`,
        409
      );
    }

    const filesToSave = files.slice(0, remainingSlots);

    const createdImages = [];
    for (let i = 0; i < filesToSave.length; i++) {
      const url = await saveUploadedFile(filesToSave[i], "products");
      const image = await prisma.productImage.create({
        data: { productId, url, sortOrder: existingCount + i },
      });
      createdImages.push(image);
    }

    return NextResponse.json(
      { images: createdImages, skipped: files.length - filesToSave.length },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return jsonError(error.message, 400);
    }
    console.error("Upload product images error:", error);
    return NextResponse.json({ message: "Unable to upload images." }, { status: 500 });
  }
}
