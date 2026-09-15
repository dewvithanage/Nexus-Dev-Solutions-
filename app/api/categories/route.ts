import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public list of categories — used by the Add/Edit Product category
// dropdown, and by the public Categories page.
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Get categories error:", error);

    return NextResponse.json(
      { message: "Unable to load categories." },
      { status: 500 }
    );
  }
}
