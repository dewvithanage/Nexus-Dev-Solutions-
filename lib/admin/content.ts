import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pageQuery } from "@/lib/request-validation";

// Data for Category Management, Content Management (reviews), Gallery
// Management and Admin Notifications, shared by the Server Component
// pages and their /api routes. Dates are ISO strings so results can be
// sent as JSON or passed straight to a Client Component.

const pagination = (page: number, pageSize: number, totalCount: number) => ({
  currentPage: page,
  totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  totalCount,
  pageSize,
});

export const categoriesQuerySchema = z.object({ ...pageQuery() });

export async function getCategoriesList({ page, pageSize }: z.infer<typeof categoriesQuerySchema>) {
  const [totalCount, categories] = await Promise.all([
    prisma.category.count(),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
    }),
  ]);
  return { categories, pagination: pagination(page, pageSize, totalCount) };
}

export type CategoriesList = Awaited<ReturnType<typeof getCategoriesList>>;

export const reviewsQuerySchema = z.object({ ...pageQuery() });

export async function getReviewsList({ page, pageSize }: z.infer<typeof reviewsQuerySchema>) {
  const [totalCount, rows] = await Promise.all([
    prisma.review.count(),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { product: { select: { id: true, name: true } } },
    }),
  ]);
  const reviews = rows.map((review) => ({ ...review, createdAt: review.createdAt.toISOString() }));
  return { reviews, pagination: pagination(page, pageSize, totalCount) };
}

export type ReviewsList = Awaited<ReturnType<typeof getReviewsList>>;

export const GALLERY_ITEMS_PER_PAGE = 10;
export const galleryQuerySchema = z.object({ ...pageQuery(GALLERY_ITEMS_PER_PAGE) }).strict();

export async function getGalleryList({ page, pageSize }: z.infer<typeof galleryQuerySchema>) {
  const [totalCount, rows] = await Promise.all([
    prisma.galleryItem.count(),
    prisma.galleryItem.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const items = rows.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }));
  return { items, pagination: pagination(page, pageSize, totalCount) };
}

export type GalleryList = Awaited<ReturnType<typeof getGalleryList>>;

const MAX_NOTIFICATIONS = 100;

// Only ever the given user's own notifications. The user id must come from
// the session, never from the request.
export async function getNotificationsFor(userId: string, type?: string) {
  const [rows, unreadCounts] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(type && { type }) },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    }),
    prisma.notification.groupBy({
      by: ["type"],
      where: { userId, isRead: false },
      _count: true,
    }),
  ]);
  const notifications = rows.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }));
  return { notifications, unreadCounts };
}

export type NotificationsList = Awaited<ReturnType<typeof getNotificationsFor>>;
