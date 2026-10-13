import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireEntrepreneur } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";
import { saveUploadedFile } from "@/lib/upload";

const MAX_IMAGES_PER_PRODUCT = 4;

// Uploads up to 4 images for a product the signed-in entrepreneur owns.
// Called from the Add Product page right after the product is created.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const { productId } = await params;
    if (!idField.safeParse(productId).success) return jsonError(404, "Product not found.");

    // Someone else's product gets the same 404 as a missing one.
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { businessId: true } });
    if (!product || product.businessId !== auth.business.id) {
      return jsonError(404, "Product not found.");
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError(400, "Request body must be form data.");
    }

    for (const key of formData.keys()) {
      if (key !== "images") return jsonError(400, `Unknown field(s): ${key}.`);
    }

    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return jsonError(400, "No images were provided.");
    }

    const existingCount = await prisma.productImage.count({ where: { productId } });
    const remainingSlots = MAX_IMAGES_PER_PRODUCT - existingCount;
    if (files.length > remainingSlots) {
      return jsonError(
        409,
        remainingSlots > 0
          ? `This product can have ${remainingSlots} more image(s) (maximum ${MAX_IMAGES_PER_PRODUCT}).`
          : `This product already has the maximum of ${MAX_IMAGES_PER_PRODUCT} images.`
      );
    }

    // Each file is checked (real image content, size) as it is saved.
    const urls: string[] = [];
    for (const file of files) {
      urls.push(await saveUploadedFile(file, "products"));
    }

    const createdImages = await prisma.$transaction(
      urls.map((url, i) =>
        prisma.productImage.create({ data: { productId, url, sortOrder: existingCount + i } })
      )
    );

    return NextResponse.json({ images: createdImages }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Upload product images error", { fallback: "Unable to upload images." });
  }
}
