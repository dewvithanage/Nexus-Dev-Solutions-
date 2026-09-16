import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
