import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "./prisma";
import { getCurrentUser } from "./session";
import { idField } from "./request-validation";

// Server-side data for the entrepreneur pages (Server Components).
//
// Pages read the database directly here instead of calling their own
// /api routes from the browser after the page has loaded. Every query is
// scoped to the business or user taken from the server-side session, never
// to an id sent by the browser, and selects only the fields the page shows.

// One session lookup per request. The (approved) layout, the page and its
// sections all ask for the user; React's cache() makes them share a single
// database lookup within the same request (it is never shared between
// requests or users).
export const getSessionUser = cache(getCurrentUser);

export type SidebarEntrepreneur = {
  fullName: string;
  businessName: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

// For entrepreneur pages: returns the signed-in entrepreneur, or redirects.
// approvedOnly matches the (approved) layout: unapproved accounts go to
// their application status page.
export async function requireEntrepreneurPage({ approvedOnly = true }: { approvedOnly?: boolean } = {}) {
  const user = await getSessionUser();
  const profile = user?.entrepreneurProfile;
  const business = profile?.business;

  if (!user || user.role !== "ENTREPRENEUR" || !profile || !business) {
    redirect("/entrepreneur/login");
  }
  if (approvedOnly && profile.status !== "APPROVED") {
    redirect("/entrepreneur/application-status");
  }

  const sidebar: SidebarEntrepreneur = {
    fullName: user.name,
    businessName: business.businessName,
    status: profile.status,
  };

  return { user, profile, business, sidebar };
}

// ---------------------------------------------------------------- products

export async function getOwnProducts(businessId: string) {
  const products = await prisma.product.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stockQuantity: true,
      status: true,
      rejectionReason: true,
      createdAt: true,
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  // Decimal can't be passed to Client Components; a plain number can.
  return products.map((product) => ({ ...product, price: Number(product.price) }));
}

export type OwnProduct = Awaited<ReturnType<typeof getOwnProducts>>[number];

// The product being edited, only if it belongs to this business. Someone
// else's product, or an id that isn't valid, gives null (the page shows 404).
export async function getOwnProductForEdit(productId: string, businessId: string) {
  if (!idField.safeParse(productId).success) return null;
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    select: {
      id: true,
      name: true,
      categoryId: true,
      description: true,
      price: true,
      stockQuantity: true,
      tags: true,
      status: true,
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } },
    },
  });
  return product && { ...product, price: Number(product.price) };
}

export type EditableProduct = NonNullable<Awaited<ReturnType<typeof getOwnProductForEdit>>>;

export function getCategoryOptions() {
  return prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

// ---------------------------------------------------------------- orders

type OrderForStats = {
  status: string;
  totalAmount: number;
  items: { quantity: number }[];
};

// Shared by the Sales & Orders page and GET /api/orders/mine, so the two
// can never show different figures.
export function computeOrderStats(orders: OrderForStats[]) {
  const verified = orders.filter((order) => order.status === "VERIFIED");
  const sum = (list: OrderForStats[]) => list.reduce((total, order) => total + order.totalAmount, 0);

  // Cancelled orders were never real completed transactions, so they're
  // excluded from the average. Everything else (pending, verified, even
  // flagged) is a real order that was placed.
  const forAverage = orders.filter((order) => order.status !== "CANCELLED");

  // Any order that hasn't reached a final state (VERIFIED, FLAGGED or
  // CANCELLED) is money still in the pipeline.
  const inPipeline = orders.filter((order) =>
    ["PENDING", "AWAITING_FULFILLMENT", "PENDING_VERIFICATION"].includes(order.status)
  );

  return {
    totalRevenue: sum(verified),
    averageOrderValue: forAverage.length > 0 ? sum(forAverage) / forAverage.length : 0,
    unitsDelivered: verified.reduce((total, order) => total + order.items.reduce((s, item) => s + item.quantity, 0), 0),
    pendingEscrow: sum(inPipeline),
  };
}

export async function getOwnOrders(businessId: string) {
  const orders = await prisma.order.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      buyerName: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      items: { select: { quantity: true, product: { select: { name: true } } } },
      salesConfirmation: { select: { id: true } },
    },
  });
  const plain = orders.map((order) => ({ ...order, totalAmount: Number(order.totalAmount) }));
  return { orders: plain, stats: computeOrderStats(plain) };
}

// The order whose proof is being uploaded, only if it belongs to this
// business (null otherwise, and the page shows 404).
export async function getOwnOrderForProof(orderId: string, businessId: string) {
  if (!idField.safeParse(orderId).success) return null;
  const order = await prisma.order.findFirst({
    where: { id: orderId, businessId },
    select: {
      id: true,
      buyerName: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      salesConfirmation: { select: { id: true } },
    },
  });
  return order && { ...order, totalAmount: Number(order.totalAmount) };
}

// ---------------------------------------------------------------- notifications

export function getOwnNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, title: true, message: true, isRead: true, createdAt: true },
  });
}

export type OwnNotification = Awaited<ReturnType<typeof getOwnNotifications>>[number];
