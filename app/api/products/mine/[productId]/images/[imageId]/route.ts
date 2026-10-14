import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireEntrepreneur } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";
import { deleteUploadedFile } from "@/lib/upload";

// Removes one image from a product the signed-in entrepreneur owns. Used by
// the "x" on an image in Edit Product, which until now only hid the image
// in the browser and never removed it from the database.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; imageId: string }> }
) {
  try {
    // Same rule as editing the product itself: approved sellers only.
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const { productId, imageId } = await params;
    if (!idField.safeParse(productId).success || !idField.safeParse(imageId).success) {
      return jsonError(404, "Image not found.");
    }

    // One query checks all three links: the image exists, it belongs to this
    // product, and the product belongs to the caller's business. Anything
    // else is 404, so ids from other shops reveal nothing.
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId, product: { businessId: auth.business.id } },
      select: { id: true, url: true },
    });
    if (!image) return jsonError(404, "Image not found.");

    await prisma.productImage.delete({ where: { id: image.id } });

    // Best effort: also delete the file (on disk or in Vercel Blob). Only
    // files lib/upload.ts saved for products are touched, so an unusual url
    // in the database can never point this at another file.
    await deleteUploadedFile(image.url, "products");

    return NextResponse.json({ message: "Image removed." });
  } catch (error) {
    return handleRouteError(error, "Delete product image error", {
      notFound: "Image not found.",
      fallback: "Unable to remove image.",
    });
  }
}
