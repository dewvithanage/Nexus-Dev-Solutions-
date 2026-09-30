import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public list of categories — used by the Add/Edit Product category
// dropdown (just needs id/name), and by the Home + Categories pages
// (which also need a product count per category, so it's included here
// rather than making a second endpoint).
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: { where: { status: "APPROVED" } } },
        },
      },
    });

    const results = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      productCount: category._count.products,
    }));

    return NextResponse.json({ categories: results }, { status: 200 });
  } catch (error) {
    console.error("Get categories error:", error);

    return NextResponse.json(
      { message: "Unable to load categories." },
      { status: 500 }
    );
  }
}
