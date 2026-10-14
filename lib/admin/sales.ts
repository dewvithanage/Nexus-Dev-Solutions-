import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pageQuery } from "@/lib/request-validation";

// Data for Sales Verification and Sales Confirmation Details, shared by the
// Server Component pages and the /api/admin/sales routes.

export const salesListQuerySchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "FLAGGED"]).optional(),
  ...pageQuery(),
});

export type SalesListQuery = z.infer<typeof salesListQuerySchema>;

export async function getSalesList({ status, page, pageSize }: SalesListQuery) {
  // "PENDING" on this page means every order that hasn't been decided yet.
  const where: Prisma.OrderWhereInput =
    status === "PENDING"
      ? { status: { in: ["PENDING", "AWAITING_FULFILLMENT", "PENDING_VERIFICATION"] } }
      : status
      ? { status }
      : {};

  const [totalCount, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        buyerName: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        business: {
          select: {
            businessName: true,
            entrepreneurProfile: { select: { user: { select: { name: true } } } },
          },
        },
        items: { select: { product: { select: { name: true } } } },
      },
    }),
  ]);

  const orders = rows.map((order) => ({
    id: order.id,
    buyerName: order.buyerName,
    sellerName: order.business.entrepreneurProfile.user.name,
    businessName: order.business.businessName,
    productNames: order.items.map((i) => i.product.name).join(", "),
    totalAmount: Number(order.totalAmount),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  }));

  return {
    orders,
    pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / pageSize)), totalCount, pageSize },
  };
}

export type SalesList = Awaited<ReturnType<typeof getSalesList>>;

// Admin only: this includes buyer details and payment proof. Never the
// guest's order access token.
export async function getSaleDetails(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      buyerName: true,
      buyerPhone: true,
      deliveryLocation: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      business: {
        select: {
          id: true,
          businessName: true,
          entrepreneurProfile: {
            select: { university: true, user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      items: {
        select: { quantity: true, unitPriceAtOrder: true, product: { select: { id: true, name: true } } },
      },
      salesConfirmation: {
        select: {
          proofImageUrl: true,
          deliveryDate: true,
          notes: true,
          verificationStatus: true,
          verifiedAt: true,
          verifiedBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!order) return null;

  // Plain numbers and ISO strings, so this can be sent as JSON or passed
  // from a Server Component to a Client Component.
  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({ ...item, unitPriceAtOrder: Number(item.unitPriceAtOrder) })),
    salesConfirmation: order.salesConfirmation && {
      ...order.salesConfirmation,
      deliveryDate: order.salesConfirmation.deliveryDate.toISOString(),
      verifiedAt: order.salesConfirmation.verifiedAt?.toISOString() ?? null,
    },
  };
}

export type SaleDetails = NonNullable<Awaited<ReturnType<typeof getSaleDetails>>>;
