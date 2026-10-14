import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError } from "@/lib/api-auth";
import { clientIp, idField, parseJsonBody, requiredText } from "@/lib/request-validation";
import { consumeRateLimit } from "@/lib/rate-limit";
import { publicProductWhere } from "@/lib/public-visibility";
import { refreshProductRating } from "@/lib/ratings";

const reviewSchema = z
  .object({
    productId: idField,
    reviewerName: requiredText(60, "Your name"),
    rating: z
      .number({ required_error: "Please choose a rating.", invalid_type_error: "Rating must be a number." })
      .int("Rating must be a whole number of stars.")
      .min(1, "Rating must be between 1 and 5.")
      .max(5, "Rating must be between 1 and 5."),
    comment: requiredText(2000, "Review"),
  })
  .strict();

// Guest reviews — customers never have accounts on this platform. To limit
// spam, one visitor can post at most 5 reviews per hour.
const REVIEWS_PER_HOUR = 5;

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, reviewSchema);
    if (parsed.error) return parsed.error;
    const { productId, reviewerName, rating, comment } = parsed.data;

    // Only products the public can actually see can be reviewed.
    const product = await prisma.product.findFirst({
      where: { id: productId, ...publicProductWhere },
      select: { id: true },
    });
    if (!product) return jsonError(404, "Product not found.");

    const limit = await consumeRateLimit(`review:${clientIp(request)}`, REVIEWS_PER_HOUR, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { message: "You've posted several reviews recently. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    // The review and the product's stored rating change together.
    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({ data: { productId, reviewerName, rating, comment } });
      await refreshProductRating(tx, productId);
      return created;
    });

    return NextResponse.json({ message: "Review submitted successfully!", review }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Submit review error", { fallback: "Unable to submit review." });
  }
}
