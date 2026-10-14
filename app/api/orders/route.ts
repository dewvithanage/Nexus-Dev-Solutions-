import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleRouteError, jsonError } from "@/lib/api-auth";
import { clientIp, idField, optionalText, parseJsonBody, phonePattern, requiredText } from "@/lib/request-validation";
import { consumeRateLimit } from "@/lib/rate-limit";
import { publicProductWhere } from "@/lib/public-visibility";

const orderSchema = z
  .object({
    businessId: idField,
    buyerName: requiredText(100, "Your name"),
    buyerPhone: requiredText(20, "Phone number").refine(
      (value) => phonePattern.test(value),
      "Please enter a valid phone number."
    ),
    deliveryLocation: requiredText(200, "Pickup or delivery location"),
    messageToEntrepreneur: optionalText(1000, "Message"),
    items: z
      .array(
        z
          .object({
            productId: idField,
            quantity: z
              .number({ invalid_type_error: "Quantity must be a number." })
              .int("Quantity must be a whole number.")
              .min(1, "Quantity must be at least 1.")
              .max(1000, "Quantity is too high."),
          })
          .strict()
      )
      .min(1, "Your order has no items.")
      .max(50, "Too many different items in one order.")
      .refine(
        (items) => new Set(items.map((item) => item.productId)).size === items.length,
        "Each product can only appear once in an order."
      ),
  })
  .strict();

// Guest checkout: at most 10 orders per visitor per hour, so a script
// can't flood sellers with fake orders and notifications.
const ORDERS_PER_HOUR = 10;

class OrderProblem extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Creates one Order for ONE business from the items in the guest's cart.
// The order is saved BEFORE the buyer is sent to WhatsApp, since there's no
// way to know if the WhatsApp message actually gets sent.
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, orderSchema);
    if (parsed.error) return parsed.error;
    const { businessId, buyerName, buyerPhone, deliveryLocation, messageToEntrepreneur, items } = parsed.data;

    const limit = await consumeRateLimit(`order:${clientIp(request)}`, ORDERS_PER_HOUR, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { message: "Too many orders from this device. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const accessToken = crypto.randomBytes(24).toString("hex");

    const order = await prisma.$transaction(async (tx) => {
      // Prices come from the database, never from the browser.
      const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) }, businessId, ...publicProductWhere },
        select: { id: true, name: true, price: true },
      });
      if (products.length !== items.length) {
        throw new OrderProblem(400, "One or more items are no longer available.");
      }
      const productById = new Map(products.map((product) => [product.id, product]));

      // Reserve stock. The condition in the update makes this safe when two
      // buyers order the last item at the same moment: only one succeeds.
      for (const item of items) {
        const reserved = await tx.product.updateMany({
          where: { id: item.productId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } },
        });
        if (reserved.count === 0) {
          throw new OrderProblem(409, `Not enough stock for "${productById.get(item.productId)!.name}".`);
        }
      }

      const totalAmount = items.reduce(
        (sum, item) => sum + Number(productById.get(item.productId)!.price) * item.quantity,
        0
      );

      const created = await tx.order.create({
        data: {
          businessId,
          buyerName,
          buyerPhone,
          deliveryLocation,
          messageToEntrepreneur,
          totalAmount,
          status: "PENDING",
          accessToken,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceAtOrder: productById.get(item.productId)!.price,
            })),
          },
        },
        select: { id: true, totalAmount: true },
      });

      // Notify the entrepreneur who owns this business.
      const business = await tx.business.findUniqueOrThrow({
        where: { id: businessId },
        select: { entrepreneurProfile: { select: { userId: true } } },
      });
      await tx.notification.create({
        data: {
          userId: business.entrepreneurProfile.userId,
          type: "ORDER",
          title: "New Order Received",
          message: `${buyerName} placed an order for Rs.${totalAmount.toFixed(2)}. Coordinate pickup via WhatsApp.`,
          relatedEntityType: "Order",
          relatedEntityId: created.id,
        },
      });

      return created;
    });

    // The access token is only ever given to the buyer here; the public
    // confirmation page needs it (see /api/orders/[orderId]).
    return NextResponse.json({ message: "Order created.", orderId: order.id, accessToken }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderProblem) return jsonError(error.status, error.message);
    return handleRouteError(error, "Create order error", { fallback: "Unable to create order." });
  }
}
