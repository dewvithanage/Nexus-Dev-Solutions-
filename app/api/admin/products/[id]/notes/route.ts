import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Separate from approve/reject on purpose — saving a note shouldn't
// change the product's status, so it gets its own small endpoint instead
// of overloading the approve/reject routes with an unrelated field.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const { adminNotes } = (await request.json()) as { adminNotes?: string };

    const product = await prisma.product.update({
      where: { id },
      data: { adminNotes: adminNotes || null },
    });

    return NextResponse.json({ message: "Notes saved.", product });
  } catch (error) {
    console.error("Save admin notes error:", error);
    return NextResponse.json({ message: "Unable to save notes." }, { status: 500 });
  }
}
