import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Entrepreneur not found.");

    const entrepreneur = await prisma.entrepreneurProfile.findUnique({
      where: { id },
      include: {
        // Only what the details page shows. Never the whole User row.
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
        business: {
          include: { products: { include: { category: true } } },
        },
      },
    });

    if (!entrepreneur) {
      return NextResponse.json({ message: "Entrepreneur not found." }, { status: 404 });
    }

    return NextResponse.json({ entrepreneur });
  } catch (error) {
    return handleRouteError(error, "Get entrepreneur details error", {
      notFound: "Entrepreneur not found.",
      fallback: "Unable to load entrepreneur.",
    });
  }
}

// NEW: permanently delete an entrepreneur (their profile, business,
// products, and account).
//
// SAFETY CHECK: same reasoning as deleting a single product, but
// checked across ALL of this entrepreneur's products at once — if any
// of their products have ever been ordered, deleting the entrepreneur
// would corrupt that order history and the revenue/rankings figures
// built from it. Deletion is blocked in that case; the admin should
// leave the account as REJECTED instead (which already hides them from
// the public directory) rather than destroying real transaction records.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!idField.safeParse(id).success) return jsonError(404, "Entrepreneur not found.");

    const entrepreneur = await prisma.entrepreneurProfile.findUnique({
      where: { id },
      include: {
        business: {
          include: {
            products: { select: { id: true, _count: { select: { orderItems: true } } } },
          },
        },
      },
    });

    if (!entrepreneur) {
      return NextResponse.json({ message: "Entrepreneur not found." }, { status: 404 });
    }

    const totalOrderItems =
      entrepreneur.business?.products.reduce((sum, product) => sum + product._count.orderItems, 0) ?? 0;

    if (totalOrderItems > 0) {
      return NextResponse.json(
        {
          message: `Cannot delete this entrepreneur — their products have ${totalOrderItems} order(s) in history. Deleting them would corrupt real sales records and revenue reports. Reject their account instead if you want to remove them from the public directory.`,
        },
        { status: 409 }
      );
    }

    // Safe to delete: none of their products have ever been ordered.
    // Delete everything in the correct order (children before parents)
    // inside one transaction, so this either fully succeeds or fully
    // rolls back — never a half-deleted account.
    const productIds = entrepreneur.business?.products.map((p) => p.id) ?? [];

    await prisma.$transaction([
      prisma.review.deleteMany({ where: { productId: { in: productIds } } }),
      prisma.product.deleteMany({ where: { id: { in: productIds } } }),
      ...(entrepreneur.business ? [prisma.business.delete({ where: { id: entrepreneur.business.id } })] : []),
      prisma.notification.deleteMany({ where: { userId: entrepreneur.userId } }),
      prisma.entrepreneurProfile.delete({ where: { id } }),
      prisma.user.delete({ where: { id: entrepreneur.userId } }),
    ]);

    return NextResponse.json({ message: "Entrepreneur permanently deleted." });
  } catch (error) {
    return handleRouteError(error, "Delete entrepreneur error", {
      notFound: "Entrepreneur not found.",
      fallback: "Unable to delete entrepreneur.",
    });
  }
}
