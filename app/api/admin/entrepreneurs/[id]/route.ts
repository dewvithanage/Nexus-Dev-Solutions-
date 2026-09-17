import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const entrepreneur = await prisma.entrepreneurProfile.findUnique({
      where: { id },
      include: {
        user: true,
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
    console.error("Get entrepreneur details error:", error);
    return NextResponse.json({ message: "Unable to load entrepreneur." }, { status: 500 });
  }
}
