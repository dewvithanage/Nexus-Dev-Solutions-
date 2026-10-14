import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Image not found.");

    await prisma.galleryItem.delete({ where: { id } });

    return NextResponse.json({ message: "Image removed from gallery." });
  } catch (error) {
    return handleRouteError(error, "Delete gallery image error", {
      notFound: "Image not found.",
      fallback: "Unable to remove image.",
    });
  }
}
