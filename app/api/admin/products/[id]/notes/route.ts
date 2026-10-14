import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { revalidateAdminPages } from "@/lib/admin/revalidate";
import { idField, optionalText, parseJsonBody } from "@/lib/request-validation";

const notesSchema = z.object({ adminNotes: optionalText(2000, "Notes") }).strict();

// Separate from approve/reject on purpose — saving a note shouldn't change
// the product's status.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Product not found.");

    const parsed = await parseJsonBody(request, notesSchema);
    if (parsed.error) return parsed.error;

    const product = await prisma.product.update({
      where: { id },
      data: { adminNotes: parsed.data.adminNotes },
      select: { id: true, adminNotes: true },
    });

    revalidateAdminPages();

    return NextResponse.json({ message: "Notes saved.", product });
  } catch (error) {
    return handleRouteError(error, "Save admin notes error", {
      notFound: "Product not found.",
      fallback: "Unable to save notes.",
    });
  }
}
