import type { Prisma } from "@prisma/client";

// Recalculates a product's stored rating summary from its reviews. Call it
// inside the same transaction that adds or removes a review, so the summary
// never drifts from the real reviews.
export async function refreshProductRating(tx: Prisma.TransactionClient, productId: string) {
  const summary = await tx.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  });

  await tx.product.update({
    where: { id: productId },
    data: { ratingAverage: summary._avg.rating ?? 0, ratingCount: summary._count },
  });
}
