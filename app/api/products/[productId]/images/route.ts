import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { saveUploadedFile } from "@/lib/upload";

// Uploads up to 4 images for a product the logged-in entrepreneur owns.
// Called from the Add Product page right after the product itself is
// created (see Risk 6 in the architecture doc — this closes that gap).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const businessId = user?.entrepreneurProfile?.business?.id;

    if (!user || user.role !== "ENTREPRENEUR" || !businessId) {
      return NextResponse.json({ message: "You must be logged in as an entrepreneur." }, { status: 401 });
    }

    const { productId } = await params;

    // Make sure this product actually belongs to the logged-in
    // entrepreneur's own business — otherwise anyone could attach images
    // to someone else's product just by guessing a product id.
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.businessId !== businessId) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ message: "No images were provided." }, { status: 400 });
    }

    const existingCount = await prisma.productImage.count({ where: { productId } });
    const remainingSlots = Math.max(0, 4 - existingCount);
    const filesToSave = files.slice(0, remainingSlots);

    const createdImages = [];
    for (let i = 0; i < filesToSave.length; i++) {
      const url = await saveUploadedFile(filesToSave[i], "products");
      const image = await prisma.productImage.create({
        data: { productId, url, sortOrder: existingCount + i },
      });
      createdImages.push(image);
    }

    return NextResponse.json({ images: createdImages }, { status: 201 });
  } catch (error) {
    console.error("Upload product images error:", error);
    return NextResponse.json({ message: "Unable to upload images." }, { status: 500 });
  }
}
