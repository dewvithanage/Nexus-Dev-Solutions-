import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Add a new product. Uses the logged-in entrepreneur's own business —
// never trust a businessId sent from the frontend, always look it up
// from the session, otherwise someone could add products to someone
// else's shop just by changing a form value.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const businessId = user?.entrepreneurProfile?.business?.id;

    if (!user || user.role !== "ENTREPRENEUR" || !businessId) {
      return NextResponse.json(
        { message: "You must be logged in as an entrepreneur to add a product." },
        { status: 401 }
      );
    }

    const body = await request.json();
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
    } = body as {
      name?: string;
      categoryId?: string;
      description?: string;
      price?: number;
      stockQuantity?: number;
      onCampusPickup?: boolean;
      areaDropOff?: boolean;
      postingEnabled?: boolean;
      tags?: string[];
    };

    if (!name || !categoryId || !description || price === undefined || stockQuantity === undefined) {
      return NextResponse.json(
        { message: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        businessId,
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
    const user = await getCurrentUser();
    const businessId = user?.entrepreneurProfile?.business?.id;

    if (!user || user.role !== "ENTREPRENEUR" || !businessId) {
      return NextResponse.json(
        { message: "You must be logged in as an entrepreneur." },
        { status: 401 }
      );
    }

    const products = await prisma.product.findMany({
      where: { businessId },
      include: { category: true, images: true },
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
