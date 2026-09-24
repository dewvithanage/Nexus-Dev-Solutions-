import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        business: {
          include: { entrepreneurProfile: { include: { user: true } } },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Get product details error:", error);
    return NextResponse.json({ message: "Unable to load product." }, { status: 500 });
  }
}

// NEW: permanently delete a product.
//
// SAFETY CHECK: a product that has ever been ordered has OrderItem
// records, which feed into Rankings and Reports (verified revenue,
// units delivered, etc.). Deleting the product would either orphan
// those OrderItems or force-cascade-delete them, silently corrupting
// real sales history and historical financial figures. So deletion is
// blocked if any order has ever included this product — the admin
// should reject/hide it instead of destroying real transaction records.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { orderItems: true } } },
    });

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    if (product._count.orderItems > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete "${product.name}" — it has ${product._count.orderItems} order(s) in its history. Deleting it would corrupt real sales records and revenue reports. Reject it instead if you want to hide it from the marketplace.`,
        },
        { status: 409 }
      );
    }

    // Safe to delete: no orders reference this product. Reviews aren't
    // linked to Rankings/Reports, so they're fine to remove along with
    // it. ProductImage rows cascade automatically (onDelete: Cascade
    // in the schema), so they don't need deleting here explicitly.
    await prisma.$transaction([
      prisma.review.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Product permanently deleted." });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ message: "Unable to delete product." }, { status: 500 });
  }
}
