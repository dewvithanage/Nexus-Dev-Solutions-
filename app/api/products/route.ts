import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJsonBody, requireEntrepreneur } from "@/lib/api";
import { productCreateSchema } from "@/lib/schemas";

// Add a new product. Uses the logged-in entrepreneur's own business —
// never trust a businessId sent from the frontend, always look it up
// from the session, otherwise someone could add products to someone
// else's shop just by changing a form value. (A "businessId" or "status"
// field in the body is rejected outright by the strict schema.)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const parsed = await parseJsonBody(request, productCreateSchema);
    if (parsed.error) return parsed.error;

    const {
      name,
      categoryId,
      description,
      price,
      stockQuantity,
      onCampusPickup,
      areaDropOff,
      postingEnabled,
      tags,
    } = parsed.data;

    // Checked up front so a bad id is a clear 400, not a foreign-key
    // error from the database turning into a 500.
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      return jsonError("The selected category does not exist.", 400);
    }

    const product = await prisma.product.create({
      data: {
        businessId: auth.business.id,
        categoryId,
        name,
        description,
        price,
        stockQuantity,
        onCampusPickup: Boolean(onCampusPickup),
        areaDropOff: Boolean(areaDropOff),
        postingEnabled: Boolean(postingEnabled),
        tags: tags ?? [],
        status: "PENDING",
      },
    });


    // Notify every admin that a new product needs review — populates the
    // "Product Alerts" tab on Admin Notifications.
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "PRODUCT_ALERT",
          title: "New Product Awaiting Review",
          message: `"${name}" was submitted and needs approval.`,
          relatedEntityType: "Product",
          relatedEntityId: product.id,
        })),
      });
    }


    return NextResponse.json(
      { message: "Product submitted for admin review.", product },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add product error:", error);

    return NextResponse.json(
      { message: "Unable to add product." },
      { status: 500 }
    );
  }
}

// Get the logged-in entrepreneur's own products ("My Products" page).
export async function GET() {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;

    const products = await prisma.product.findMany({
      where: { businessId: auth.business.id },
      include: { category: true, images: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("Get products error:", error);

    return NextResponse.json(
      { message: "Unable to load products." },
      { status: 500 }
    );
  }
}
