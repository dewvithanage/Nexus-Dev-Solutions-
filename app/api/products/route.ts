import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError, requireEntrepreneur } from "@/lib/api-auth";
import { parseJsonBody } from "@/lib/request-validation";
import { createProductSchema } from "@/lib/product-schema";

// Add a new product. Only APPROVED entrepreneurs can sell. The product is
// always added to the signed-in entrepreneur's own business — never a
// businessId sent from the browser — and always starts as PENDING review.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const parsed = await parseJsonBody(request, createProductSchema);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
    if (!category) return jsonError(400, "That category doesn't exist.");

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          categoryId: data.categoryId,
          description: data.description,
          price: data.price,
          stockQuantity: data.stockQuantity,
          tags: data.tags,
          onCampusPickup: data.onCampusPickup,
          areaDropOff: data.areaDropOff,
          postingEnabled: data.postingEnabled,
          businessId: auth.business.id,
          status: "PENDING",
        },
      });

      // Notify every admin that a new product needs review — populates the
      // "Product Alerts" tab on Admin Notifications.
      const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "PRODUCT_ALERT",
            title: "New Product Awaiting Review",
            message: `"${created.name}" was submitted and needs approval.`,
            relatedEntityType: "Product",
            relatedEntityId: created.id,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ message: "Product submitted for admin review.", product }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Add product error", { fallback: "Unable to add product." });
  }
}

// The signed-in entrepreneur's own products ("My Products" page). Pending
// accounts may look, so they can see what they submitted.
export async function GET() {
  try {
    const auth = await requireEntrepreneur({ approvedOnly: false });
    if (auth.error) return auth.error;

    const products = await prisma.product.findMany({
      where: { businessId: auth.business.id },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Get products error", { fallback: "Unable to load products." });
  }
}
