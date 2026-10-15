import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/orders/[orderId]/route";
import { prisma } from "@/lib/prisma";
import { createEntrepreneur, createOrder, createProduct, jsonRequest, resetDatabase, routeParams } from "./helpers";

beforeEach(resetDatabase);
const token = "a".repeat(48);
async function savedOrder(accessToken = token) {
  const seller = await createEntrepreneur();
  const businessId = seller.entrepreneurProfile!.business!.id;
  const product = await createProduct(businessId);
  const order = await createOrder(businessId, product.id);
  return prisma.order.update({ where: { id: order.id }, data: { accessToken } });
}
const read = (id: string, accessToken = "") => GET(
  jsonRequest(`/api/orders/${id}?token=${accessToken}`, "GET"), routeParams({ orderId: id })
);

describe("Dewmi WhatsApp order confirmation", () => {
  it("blocks a missing or incorrect token and leaves the order unchanged", async () => {
    const order = await savedOrder();
    expect((await read(order.id)).status).toBe(404);
    expect((await read(order.id, "b".repeat(48))).status).toBe(404);
    expect(await prisma.order.findUnique({ where: { id: order.id } })).toEqual(order);
  });
  it("returns saved order details only to the holder of its token", async () => {
    const order = await savedOrder();
    const response = await read(order.id, token);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.order.id).toBe(order.id);
    expect(Number(body.order.totalAmount)).toBe(Number(order.totalAmount));
    expect(body.order.items).toHaveLength(1);
    expect(body.order).not.toHaveProperty("accessToken");
    expect(body.order).not.toHaveProperty("buyerPhone");
  });
  it("does not accept another order's identifier with the same token", async () => {
    const own = await savedOrder();
    const other = await savedOrder("c".repeat(48));
    expect((await read(own.id, token)).status).toBe(200);
    expect((await read(other.id, token)).status).toBe(404);
  });
});
