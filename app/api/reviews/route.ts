import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reviews are from guests — no login required (see Risk 1 in the
// architecture doc: customers never have accounts on this platform).
export async function POST(request: NextRequest) {
  try {
    const { productId, reviewerName, rating, comment } = (await request.json()) as {
      productId?: string;
      reviewerName?: string;
      rating?: number;
      comment?: string;
    };

    if (!productId || !reviewerName || !rating || !comment) {
      return NextResponse.json(
        { message: "Please fill in your name, a rating, and a review." },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    const review = await prisma.review.create({
      data: { productId, reviewerName, rating, comment },
    });

    return NextResponse.json({ message: "Review submitted successfully!", review }, { status: 201 });
  } catch (error) {
    console.error("Submit review error:", error);
    return NextResponse.json({ message: "Unable to submit review." }, { status: 500 });
  }
}
