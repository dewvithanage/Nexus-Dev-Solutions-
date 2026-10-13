import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getMyOrders } from "@/app/api/orders/mine/route";
import { POST as submitProof } from "@/app/api/orders/[orderId]/confirmation/route";
import { GET as listNotifications, PATCH as markAllRead } from "@/app/api/notifications/route";
import { PATCH as markOneRead } from "@/app/api/notifications/[id]/route";
import { prisma } from "@/lib/prisma";
import {
  createAdmin,
  createEntrepreneur,
  createOrder,
  createProduct,
  fakePngFile,
  formRequest,
  jsonRequest,
  removeUploadedTestFiles,
  resetDatabase,
  routeParams,
  signInAs,
  tinyPngFile,
  uploadedFileExists,
} from "./helpers";

// The entrepreneur's orders and sales proof (GET /api/orders/mine,
// POST /api/orders/[orderId]/confirmation) and notifications
// (GET/PATCH /api/notifications, PATCH /api/notifications/[id]).

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

async function sellerWithOrder(status: "PENDING" | "PENDING_VERIFICATION" | "VERIFIED" = "PENDING") {
  const seller = await createEntrepreneur();
  const product = await createProduct(businessOf(seller).id);
  const order = await createOrder(businessOf(seller).id, product.id, status);
  return { seller, product, order };
}

const proof = (fields: Record<string, string | File | undefined> = {}) => {
  const values = { proofImage: tinyPngFile(), deliveryDate: new Date().toISOString(), notes: "Handed over", ...fields };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) form.append(key, value);
  return form;
};
const submit = (orderId: string, form: FormData) =>
  submitProof(formRequest(`/api/orders/${orderId}/confirmation`, "POST", form), routeParams({ orderId }));

beforeEach(async () => {
  await removeUploadedTestFiles();
  await resetDatabase();
});

afterAll(removeUploadedTestFiles);

describe("GET /api/orders/mine", () => {
  it("401 without a session, 403 for an admin", async () => {
    expect((await getMyOrders()).status).toBe(401);
    await signInAs(await createAdmin());
    expect((await getMyOrders()).status).toBe(403);
  });

  it("returns only the caller's orders", async () => {
    const { seller, order } = await sellerWithOrder();
    await sellerWithOrder();
    await signInAs(seller);

    const body = await (await getMyOrders()).json();

    expect(body.orders.map((o: { id: string }) => o.id)).toEqual([order.id]);
  });
});

describe("POST /api/orders/[orderId]/confirmation", () => {
  it("401 without a session, 403 for an admin", async () => {
    const { order } = await sellerWithOrder();
    expect((await submit(order.id, proof())).status).toBe(401);
    await signInAs(await createAdmin());
    expect((await submit(order.id, proof())).status).toBe(403);
  });

  it("saves the owner's proof and moves the order to PENDING_VERIFICATION", async () => {
    const { seller, order } = await sellerWithOrder();
    await signInAs(seller);

    expect((await submit(order.id, proof())).status).toBe(201);

    const saved = await prisma.salesConfirmation.findUnique({ where: { orderId: order.id } });
    expect(saved).toMatchObject({ notes: "Handed over", verificationStatus: "PENDING" });
    expect(uploadedFileExists(saved!.proofImageUrl)).toBe(true);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe("PENDING_VERIFICATION");
  });

  it("another entrepreneur gets 404 and the order is untouched", async () => {
    const { order } = await sellerWithOrder();
    await signInAs(await createEntrepreneur());

    expect((await submit(order.id, proof())).status).toBe(404);
    expect(await prisma.salesConfirmation.count()).toBe(0);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe("PENDING");
  });

  it("404 for an order that does not exist", async () => {
    await signInAs(await createEntrepreneur());
    expect((await submit("no-such-order", proof())).status).toBe(404);
  });

  it("a second submission is 409 and the first is kept", async () => {
    const { seller, order } = await sellerWithOrder();
    await signInAs(seller);
    await submit(order.id, proof());

    expect((await submit(order.id, proof({ notes: "second try" }))).status).toBe(409);
    expect((await prisma.salesConfirmation.findUnique({ where: { orderId: order.id } }))!.notes).toBe("Handed over");
  });

  it("409 for an order that is already verified", async () => {
    const { seller, order } = await sellerWithOrder("VERIFIED");
    await signInAs(seller);
    expect((await submit(order.id, proof())).status).toBe(409);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe("VERIFIED");
  });

  it.each([
    ["no photo", { proofImage: undefined }],
    ["a fake image", { proofImage: fakePngFile() }],
    ["an invalid date", { deliveryDate: "not-a-date" }],
    ["a date in the future", { deliveryDate: new Date(Date.now() + 7 * 86_400_000).toISOString() }],
    ["an unexpected field", { verificationStatus: "VERIFIED" }],
  ])("rejects %s with 400 and changes nothing", async (_label, change) => {
    const { seller, order } = await sellerWithOrder();
    await signInAs(seller);

    expect((await submit(order.id, proof(change))).status).toBe(400);
    expect(await prisma.salesConfirmation.count()).toBe(0);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe("PENDING");
  });
});

describe("notifications", () => {
  const notify = (userId: string) =>
    prisma.notification.create({ data: { userId, type: "ORDER", title: "New order", message: "Hello" } });
  const markOne = (id: string) => markOneRead(jsonRequest(`/api/notifications/${id}`, "PATCH"), routeParams({ id }));

  it("401 without a session", async () => {
    expect((await listNotifications(jsonRequest("/api/notifications", "GET"))).status).toBe(401);
    expect((await markAllRead()).status).toBe(401);
    expect((await markOne("x")).status).toBe(401);
  });

  it("lists only the caller's notifications", async () => {
    const me = await createEntrepreneur();
    const mine = await notify(me.id);
    await notify((await createEntrepreneur()).id);
    await signInAs(me);

    const body = await (await listNotifications(jsonRequest("/api/notifications", "GET"))).json();

    expect(body.notifications.map((n: { id: string }) => n.id)).toEqual([mine.id]);
  });

  it("marks the caller's own notification as read; someone else's is 404 and stays unread", async () => {
    const me = await createEntrepreneur();
    const mine = await notify(me.id);
    const theirs = await notify((await createEntrepreneur()).id);
    await signInAs(me);

    expect((await markOne(mine.id)).status).toBe(200);
    expect((await markOne(theirs.id)).status).toBe(404);

    expect((await prisma.notification.findUnique({ where: { id: mine.id } }))!.isRead).toBe(true);
    expect((await prisma.notification.findUnique({ where: { id: theirs.id } }))!.isRead).toBe(false);
  });

  it("mark all as read only touches the caller's notifications", async () => {
    const me = await createEntrepreneur();
    await notify(me.id);
    const theirs = await notify((await createEntrepreneur()).id);
    await signInAs(me);

    expect((await markAllRead()).status).toBe(200);

    expect(await prisma.notification.count({ where: { userId: me.id, isRead: false } })).toBe(0);
    expect((await prisma.notification.findUnique({ where: { id: theirs.id } }))!.isRead).toBe(false);
  });
});
