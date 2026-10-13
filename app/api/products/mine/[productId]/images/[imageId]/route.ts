import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import { jsonError, requireEntrepreneur } from "@/lib/api";

// Removes one image from a product the signed-in entrepreneur owns. Used by
// the "x" on an image in Edit Product, which until now only hid the image
// in the browser and never removed it from the database.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; imageId: string }> }
) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const { productId, imageId } = await params;

    // One query checks all three links: the image exists, it belongs to
    // this product, and the product belongs to the caller's business.
    // Anything else is 404 so other shops' ids reveal nothing.
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId, product: { businessId: auth.business.id } },
      select: { id: true, url: true },
    });

    if (!image) {
      return jsonError("Image not found.", 404);
    }

    await prisma.productImage.delete({ where: { id: image.id } });

    // Best effort: also delete the file. Only files saved by lib/upload.ts
    // (/uploads/products/<uuid>.<ext>) are touched, so a strange url in the
    // database can never point this at another file on the server.
    if (/^\/uploads\/products\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(image.url)) {
      await unlink(path.join(process.cwd(), "public", image.url)).catch(() => {});
    }

    return NextResponse.json({ message: "Image removed." });
  } catch (error) {
    console.error("Delete product image error:", error);
    return NextResponse.json({ message: "Unable to remove image." }, { status: 500 });
  }
}
