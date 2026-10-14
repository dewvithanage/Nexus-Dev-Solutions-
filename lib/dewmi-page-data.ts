import crypto from "crypto";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/public-visibility";

const validId = (id: string) => /^[A-Za-z0-9_-]{1,64}$/.test(id);
export const REVIEW_PAGE_SIZE = 20;
export const GALLERY_PAGE_SIZE = 24;
export function pageNumber(value?: string | string[]) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= 100000 ? page : 1;
}

export async function getGalleryPage(page: number) {
  const [items, total] = await Promise.all([
    prisma.galleryItem.findMany({ select: { id: true, imageUrl: true, caption: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: GALLERY_PAGE_SIZE, skip: (page - 1) * GALLERY_PAGE_SIZE }),
    prisma.galleryItem.count(),
  ]);
  return { items, total, totalPages: Math.ceil(total / GALLERY_PAGE_SIZE) };
}

// React cache deduplicates public metadata/page queries within a render;
// it is not a persistent shared cache of account or order data.
export const getReviewProduct = cache(async (productId: string) => {
  if (!validId(productId)) return null;
  return prisma.product.findFirst({ where: { id: productId, ...publicProductWhere },
    select: { id: true, name: true, business: { select: { businessName: true } } } });
});

export async function getReviewsPage(productId: string, page: number) {
  const product = await getReviewProduct(productId);
  if (!product) return null;
  const [reviews, groups] = await Promise.all([
    prisma.review.findMany({ where: { productId }, select: { id: true, reviewerName: true, rating: true, comment: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: REVIEW_PAGE_SIZE, skip: (page - 1) * REVIEW_PAGE_SIZE }),
    prisma.review.groupBy({ by: ["rating"], where: { productId }, _count: true }),
  ]);
  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalReviews = 0;
  let ratingSum = 0;
  for (const group of groups) {
    breakdown[group.rating] = group._count;
    totalReviews += group._count;
    ratingSum += group.rating * group._count;
  }
  return { product, reviews, totalPages: Math.ceil(totalReviews / REVIEW_PAGE_SIZE),
    summary: { totalReviews, averageRating: totalReviews ? Number((ratingSum / totalReviews).toFixed(1)) : 0, breakdown } };
}

// Private guest data: never persist this lookup in a shared cache.
export async function getOrderConfirmation(orderId: string, token: string) {
  if (!validId(orderId) || !/^[a-f0-9]{48}$/.test(token)) return null;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: {
    id: true, accessToken: true, totalAmount: true, deliveryLocation: true,
    items: { select: { quantity: true, unitPriceAtOrder: true, product: { select: { name: true } } } },
    business: { select: { entrepreneurProfile: { select: { whatsappNumber: true, user: { select: { name: true } } } } } },
  } });
  if (!order?.accessToken || !/^[a-f0-9]{48}$/.test(order.accessToken) ||
    !crypto.timingSafeEqual(Buffer.from(order.accessToken), Buffer.from(token))) return null;
  return { id: order.id, totalAmount: Number(order.totalAmount), deliveryLocation: order.deliveryLocation,
    entrepreneurName: order.business.entrepreneurProfile.user.name,
    entrepreneurWhatsApp: order.business.entrepreneurProfile.whatsappNumber,
    items: order.items.map((item) => ({ productName: item.product.name, quantity: item.quantity, unitPrice: Number(item.unitPriceAtOrder) })) };
}
