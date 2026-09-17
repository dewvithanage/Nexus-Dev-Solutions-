import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Get admin reviews error:", error);
    return NextResponse.json({ message: "Unable to load reviews." }, { status: 500 });
  }
}
