import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as listSales } from "@/app/api/admin/sales/route";
import { GET as getSale } from "@/app/api/admin/sales/[orderId]/route";
import { PATCH as verifySale } from "@/app/api/admin/sales/[orderId]/verify/route";
import { PATCH as flagSale } from "@/app/api/admin/sales/[orderId]/flag/route";
import { createSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import {
  createAdmin,
  createEntrepreneur,
  createOrder,
  createProduct,
  jsonRequest,
  resetDatabase,
  routeParams,
  sessionTokenFor,
  signInAs,
} from "./helpers";

// Security tests for Sales Verification and Sales Confirmation Details:
//   GET   /api/admin/sales                    (private: every order on the platform)
//   GET   /api/admin/sales/[orderId]          (private: buyer details and payment proof)
//   PATCH /api/admin/sales/[orderId]/verify   (changes data: releases the escrow)
//   PATCH /api/admin/sales/[orderId]/flag     (changes data: marks a sale as disputed)

const cookieJar = (globalThis as { __testCookieJar?: Map<string, string> }).__testCookieJar!;

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

// An order whose seller has uploaded proof, waiting for an admin decision.
async function saleAwaitingVerification() {
  const seller = await createEntrepreneur();
  const product = await createProduct(businessOf(seller).id);
  const order = await createOrder(businessOf(seller).id, product.id, "PENDING_VERIFICATION");
  await prisma.order.update({ where: { id: order.id }, data: { accessToken: "secret-guest-token" } });
  await prisma.salesConfirmation.create({
    data: { orderId: order.id, proofImageUrl: "/uploads/proofs/proof.png", deliveryDate: new Date() },
  });
  return { seller, order };
}

const list = (query = "") => listSales(jsonRequest(`/api/admin/sales${query}`, "GET"));
const details = (orderId: string) =>
  getSale(jsonRequest(`/api/admin/sales/${orderId}`, "GET"), routeParams({ orderId }));
const verify = (orderId: string, body?: unknown) =>
  verifySale(jsonRequest(`/api/admin/sales/${orderId}/verify`, "PATCH", body), routeParams({ orderId }));
const flag = (orderId: string, body?: unknown) =>
  flagSale(jsonRequest(`/api/admin/sales/${orderId}/flag`, "PATCH", body), routeParams({ orderId }));

async function orderState(orderId: string) {
  return prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { salesConfirmation: true } });
}

beforeEach(resetDatabase);

describe("GET /api/admin/sales", () => {
  it("rejects a request with no session with 401", async () => {
    await saleAwaitingVerification();
    expect((await list()).status).toBe(401);
  });

  it("rejects a signed-in entrepreneur with 403, even the seller of the orders", async () => {
    const { seller } = await saleAwaitingVerification();
    await signInAs(seller);

    expect((await list()).status).toBe(403);
  });

  it("rejects a token that claims ADMIN for an entrepreneur account with 401", async () => {
    const { seller } = await saleAwaitingVerification();
    const { sessionVersion } = await prisma.user.findUniqueOrThrow({ where: { id: seller.id }, omit: { sessionVersion: false } });
    cookieJar.set(SESSION_COOKIE_NAME, await createSessionToken({ userId: seller.id, role: "ADMIN", sessionVersion }));

    expect((await list()).status).toBe(401);
  });

  it("rejects an admin token signed with the wrong secret with 401", async () => {
    await saleAwaitingVerification();
    const admin = await createAdmin();
    const forged = await new SignJWT({ userId: admin.id, role: "ADMIN", sessionVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("not-the-real-secret"));
    cookieJar.set(SESSION_COOKIE_NAME, forged);

    expect((await list()).status).toBe(401);
  });

  it("rejects an admin session that was signed out everywhere with 401", async () => {
    await saleAwaitingVerification();
    const admin = await createAdmin();
    const oldToken = await sessionTokenFor(admin);
    await prisma.user.update({ where: { id: admin.id }, data: { sessionVersion: { increment: 1 } } });
    cookieJar.set(SESSION_COOKIE_NAME, oldToken);

    expect((await list()).status).toBe(401);
  });

  it("lists orders for an admin without the buyer's phone or the guest access token", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    const response = await list();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders.map((o: { id: string }) => o.id)).toEqual([order.id]);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("secret-guest-token");
    expect(raw).not.toContain("0771234567");
  });

  it("rejects an unknown status filter with 400", async () => {
    await signInAs(await createAdmin());
    expect((await list("?status=DROP%20TABLE")).status).toBe(400);
  });

  it("rejects a page size above the limit with 400", async () => {
    await signInAs(await createAdmin());
    expect((await list("?pageSize=100000")).status).toBe(400);
  });
});

describe("GET /api/admin/sales/[orderId]", () => {
  it("rejects a request with no session with 401", async () => {
    const { order } = await saleAwaitingVerification();
    expect((await details(order.id)).status).toBe(401);
  });

  it("rejects the seller of the order with 403", async () => {
    const { seller, order } = await saleAwaitingVerification();
    await signInAs(seller);

    expect((await details(order.id)).status).toBe(403);
  });

  it("returns the order to an admin without the guest access token or user secrets", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    const response = await details(order.id);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.id).toBe(order.id);
    expect(body.order.salesConfirmation.proofImageUrl).toBe("/uploads/proofs/proof.png");
    expect(body.order).not.toHaveProperty("accessToken");
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("secret-guest-token");
    expect(raw).not.toContain("passwordHash");
    expect(raw).not.toContain("resetToken");
  });

  it("answers 404 for an unknown order", async () => {
    await signInAs(await createAdmin());
    expect((await details("does-not-exist")).status).toBe(404);
  });

  it("answers 404 for a malformed id instead of querying with it", async () => {
    await signInAs(await createAdmin());
    expect((await details("../../etc/passwd")).status).toBe(404);
    expect((await details("' OR 1=1 --")).status).toBe(404);
  });
});

describe("PATCH /api/admin/sales/[orderId]/verify", () => {
  it("rejects a request with no session with 401 and changes nothing", async () => {
    const { order } = await saleAwaitingVerification();

    expect((await verify(order.id)).status).toBe(401);

    const state = await orderState(order.id);
    expect(state.status).toBe("PENDING_VERIFICATION");
    expect(state.salesConfirmation!.verificationStatus).toBe("PENDING");
  });

  it("does not let the seller verify their own sale (403) and changes nothing", async () => {
    const { seller, order } = await saleAwaitingVerification();
    await signInAs(seller);

    expect((await verify(order.id)).status).toBe(403);

    const state = await orderState(order.id);
    expect(state.status).toBe("PENDING_VERIFICATION");
    expect(state.salesConfirmation!.verifiedById).toBeNull();
    expect(await prisma.notification.count()).toBe(0);
  });

  it("lets an admin verify, records that admin, and notifies the seller", async () => {
    const { seller, order } = await saleAwaitingVerification();
    const admin = await createAdmin();
    await signInAs(admin);

    const response = await verify(order.id);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order).not.toHaveProperty("accessToken");
    const state = await orderState(order.id);
    expect(state.status).toBe("VERIFIED");
    expect(state.salesConfirmation!.verificationStatus).toBe("VERIFIED");
    expect(state.salesConfirmation!.verifiedById).toBe(admin.id);
    expect(await prisma.notification.count({ where: { userId: seller.id, title: "Sale Verified" } })).toBe(1);
  });

  it("records the signed-in admin, not a verifiedById sent in the body", async () => {
    const { order } = await saleAwaitingVerification();
    const admin = await createAdmin();
    const otherAdmin = await createAdmin();
    await signInAs(admin);

    await verify(order.id, { verifiedById: otherAdmin.id });

    expect((await orderState(order.id)).salesConfirmation!.verifiedById).toBe(admin.id);
  });

  it("refuses an order with no proof uploaded with 409", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    const order = await createOrder(businessOf(seller).id, product.id, "PENDING_VERIFICATION");
    await signInAs(await createAdmin());

    expect((await verify(order.id)).status).toBe(409);
    expect((await orderState(order.id)).status).toBe("PENDING_VERIFICATION");
  });

  it("refuses to verify a flagged sale with 409", async () => {
    const { order } = await saleAwaitingVerification();
    await prisma.order.update({ where: { id: order.id }, data: { status: "FLAGGED" } });
    await signInAs(await createAdmin());

    expect((await verify(order.id)).status).toBe(409);
    expect((await orderState(order.id)).status).toBe("FLAGGED");
  });

  it("refuses to verify the same sale twice, and notifies the seller only once", async () => {
    const { seller, order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    expect((await verify(order.id)).status).toBe(200);
    expect((await verify(order.id)).status).toBe(409);
    expect(await prisma.notification.count({ where: { userId: seller.id } })).toBe(1);
  });

  it("answers 404 for an unknown or malformed order id", async () => {
    await signInAs(await createAdmin());
    expect((await verify("does-not-exist")).status).toBe(404);
    expect((await verify("bad id!")).status).toBe(404);
  });
});

describe("PATCH /api/admin/sales/[orderId]/flag", () => {
  it("rejects a request with no session with 401 and changes nothing", async () => {
    const { order } = await saleAwaitingVerification();

    expect((await flag(order.id, { notes: "Suspicious" })).status).toBe(401);
    expect((await orderState(order.id)).status).toBe("PENDING_VERIFICATION");
  });

  it("rejects a signed-in entrepreneur with 403 and changes nothing", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createEntrepreneur());

    expect((await flag(order.id, { notes: "Suspicious" })).status).toBe(403);
    expect((await orderState(order.id)).status).toBe("PENDING_VERIFICATION");
  });

  it("lets an admin flag a sale with notes and notifies the seller", async () => {
    const { seller, order } = await saleAwaitingVerification();
    const admin = await createAdmin();
    await signInAs(admin);

    const response = await flag(order.id, { notes: "Amount does not match proof" });

    expect(response.status).toBe(200);
    const state = await orderState(order.id);
    expect(state.status).toBe("FLAGGED");
    expect(state.salesConfirmation!.verificationStatus).toBe("FLAGGED");
    expect(state.salesConfirmation!.verifiedById).toBe(admin.id);
    expect(state.salesConfirmation!.notes).toBe("Amount does not match proof");
    expect(await prisma.notification.count({ where: { userId: seller.id } })).toBe(1);
  });

  it("lets an admin flag a sale with an empty body", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    expect((await flag(order.id)).status).toBe(200);
    expect((await orderState(order.id)).status).toBe("FLAGGED");
  });

  it("rejects extra fields such as status or verifiedById with 400 and changes nothing", async () => {
    const { order } = await saleAwaitingVerification();
    const otherAdmin = await createAdmin();
    await signInAs(await createAdmin());

    const response = await flag(order.id, { notes: "x", status: "VERIFIED", verifiedById: otherAdmin.id });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toMatch(/status|verifiedById/);
    const state = await orderState(order.id);
    expect(state.status).toBe("PENDING_VERIFICATION");
    expect(state.salesConfirmation!.verifiedById).toBeNull();
  });

  it("rejects notes that are too long with 400", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    expect((await flag(order.id, { notes: "a".repeat(1001) })).status).toBe(400);
    expect((await orderState(order.id)).status).toBe("PENDING_VERIFICATION");
  });

  it("rejects a malformed JSON body with 400", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());
    const broken = new NextRequest(new URL(`/api/admin/sales/${order.id}/flag`, "http://localhost"), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{notes:",
    });

    const response = await flagSale(broken, routeParams({ orderId: order.id }));

    expect(response.status).toBe(400);
  });

  it("refuses to flag an order that has no proof yet with 409", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    const order = await createOrder(businessOf(seller).id, product.id, "PENDING");
    await signInAs(await createAdmin());

    expect((await flag(order.id)).status).toBe(409);
    expect((await orderState(order.id)).status).toBe("PENDING");
  });

  it("answers 404 for an unknown order", async () => {
    await signInAs(await createAdmin());
    expect((await flag("does-not-exist")).status).toBe(404);
  });
});
