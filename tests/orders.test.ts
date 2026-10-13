import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { GET as getMyOrders } from "@/app/api/orders/mine/route";
import { POST as submitConfirmation } from "@/app/api/orders/[orderId]/confirmation/route";
import {
  createAdmin,
  createCategory,
  createEntrepreneur,
  createOrder,
  createProduct,
  fakePngFile,
  formRequest,
  params,
  pngFile,
  prisma,
  removeUploadedTestFiles,
  resetDatabase,
  signInAs,
  signOut,
  uploadedFileExists,
} from "./helpers";

beforeEach(async () => {
  await removeUploadedTestFiles();
  await resetDatabase();
  signOut();
});

afterAll(async () => {
  await removeUploadedTestFiles();
  await prisma.$disconnect();
});

async function shopWithProduct() {
  const category = await createCategory();
  const owner = await createEntrepreneur();
  const product = await createProduct(owner.business.id, category.id);
  return { owner, product };
}

describe("GET /api/orders/mine", () => {
  it("401 without a session", async () => {
    expect((await getMyOrders()).status).toBe(401);
  });

  it("403 for a signed-in admin", async () => {
    await signInAs(await createAdmin());
    expect((await getMyOrders()).status).toBe(403);
  });

  it("returns only the caller's orders, with stats computed from them", async () => {
    const { owner, product } = await shopWithProduct();
    const other = await shopWithProduct();
    await createOrder(owner.business.id, product.id, { status: "VERIFIED", quantity: 2, unitPrice: 500 });
    await createOrder(owner.business.id, product.id, { status: "PENDING", quantity: 1, unitPrice: 300 });
    await createOrder(owner.business.id, product.id, { status: "CANCELLED", quantity: 1, unitPrice: 9999 });
    await createOrder(other.owner.business.id, other.product.id, { status: "VERIFIED", quantity: 5, unitPrice: 1000 });
    await signInAs(owner.user);

    const body = await (await getMyOrders()).json();
    expect(body.orders).toHaveLength(3);
    body.orders.forEach((order: { businessId: string }) => expect(order.businessId).toBe(owner.business.id));
    expect(body.stats).toEqual({
      totalRevenue: 1000, // VERIFIED only
      averageOrderValue: 650, // (1000 + 300) / 2, cancelled excluded
      unitsDelivered: 2,
      pendingEscrow: 300,
    });
  });
});

describe("POST /api/orders/[orderId]/confirmation", () => {
  function proofForm(fields: Record<string, string | File | undefined>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) form.append(key, value);
    }
    return form;
  }

  const yesterday = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const submit = (orderId: string, fields: Record<string, string | File | undefined>) =>
    submitConfirmation(formRequest(`/api/orders/${orderId}/confirmation`, proofForm(fields)), params({ orderId }));

  const validProof = () => ({ proofImage: pngFile(), deliveryDate: yesterday(), notes: "Handed over at the library" });

  it("401 without a session", async () => {
    const { owner, product } = await shopWithProduct();
    const order = await createOrder(owner.business.id, product.id);
    expect((await submit(order.id, validProof())).status).toBe(401);
  });

  it("403 for a signed-in admin", async () => {
    const { owner, product } = await shopWithProduct();
    const order = await createOrder(owner.business.id, product.id);
    await signInAs(await createAdmin());
    expect((await submit(order.id, validProof())).status).toBe(403);
  });

  it("the owner's proof is saved and the order moves to PENDING_VERIFICATION", async () => {
    const { owner, product } = await shopWithProduct();
    const order = await createOrder(owner.business.id, product.id, { status: "AWAITING_FULFILLMENT" });
    await signInAs(owner.user);

    const response = await submit(order.id, validProof());
    expect(response.status).toBe(201);

    const confirmation = await prisma.salesConfirmation.findUnique({ where: { orderId: order.id } });
    expect(confirmation).toMatchObject({ notes: "Handed over at the library", verificationStatus: "PENDING" });
    expect(uploadedFileExists(confirmation!.proofImageUrl)).toBe(true);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe("PENDING_VERIFICATION");
  });

  it("another entrepreneur gets 404 and the order is untouched", async () => {
    const { owner, product } = await shopWithProduct();
    const intruder = await createEntrepreneur();
    const order = await createOrder(owner.business.id, product.id);
    await signInAs(intruder.user);

    expect((await submit(order.id, validProof())).status).toBe(404);
    expect(await prisma.salesConfirmation.count()).toBe(0);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe("PENDING");
  });

  it("404 for an order that does not exist", async () => {
    const { owner } = await shopWithProduct();
    await signInAs(owner.user);
    expect((await submit("no-such-order", validProof())).status).toBe(404);
  });

  it("a second submission for the same order is 409 and the first one is kept", async () => {
    const { owner, product } = await shopWithProduct();
    const order = await createOrder(owner.business.id, product.id);
    await signInAs(owner.user);
    await submit(order.id, validProof());

    const second = await submit(order.id, { ...validProof(), notes: "second try" });
    expect(second.status).toBe(409);
    expect(await prisma.salesConfirmation.count({ where: { orderId: order.id } })).toBe(1);
    expect((await prisma.salesConfirmation.findUnique({ where: { orderId: order.id } }))!.notes).toBe(
      "Handed over at the library"
    );
  });

  it.each(["VERIFIED", "CANCELLED", "FLAGGED"] as const)("409 for an order that is already %s", async (status) => {
    const { owner, product } = await shopWithProduct();
    const order = await createOrder(owner.business.id, product.id, { status });
    await signInAs(owner.user);

    expect((await submit(order.id, validProof())).status).toBe(409);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe(status);
  });

  it.each([
    ["no photo", { proofImage: undefined }],
    ["a fake image", { proofImage: fakePngFile() }],
    ["no delivery date", { deliveryDate: undefined }],
    ["an invalid date", { deliveryDate: "not-a-date" }],
    ["a date in the future", { deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }],
    ["notes that are too long", { notes: "x".repeat(1001) }],
    ["an unexpected field", { verificationStatus: "VERIFIED" }],
  ])("rejects %s with 400 and changes nothing", async (_label, change) => {
    const { owner, product } = await shopWithProduct();
    const order = await createOrder(owner.business.id, product.id);
    await signInAs(owner.user);

    expect((await submit(order.id, { ...validProof(), ...change })).status).toBe(400);
    expect(await prisma.salesConfirmation.count()).toBe(0);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe("PENDING");
  });
});
