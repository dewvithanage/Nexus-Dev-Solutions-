import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  computeOrderStats,
  getOwnNotifications,
  getOwnOrderForProof,
  getOwnOrders,
  getOwnProductForEdit,
  getOwnProducts,
  getSessionUser,
  requireEntrepreneurPage,
} from "@/lib/entrepreneur-data";
import { createAdmin, createEntrepreneur, createOrder, createProduct, resetDatabase, signInAs, signOut } from "./helpers";

// lib/entrepreneur-data.ts: the server-side data the entrepreneur pages
// render from. Every function is scoped to the signed-in seller's business
// or user, so one seller's page can never show another seller's records.

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

// redirect() and notFound() from next/navigation work by throwing an error
// whose digest names the target; this reads it back.
async function redirectTarget(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return digest.split(";")[2];
    throw error;
  }
  return null;
}

beforeEach(resetDatabase);

describe("requireEntrepreneurPage", () => {
  it("sends a visitor without a session, or an admin, to the sign-in page", async () => {
    signOut();
    expect(await redirectTarget(() => requireEntrepreneurPage())).toBe("/entrepreneur/login");

    await signInAs(await createAdmin());
    expect(await redirectTarget(() => requireEntrepreneurPage())).toBe("/entrepreneur/login");
  });

  it("sends a pending seller to the application status page, unless the page allows pending accounts", async () => {
    const pending = await createEntrepreneur("PENDING");
    await signInAs(pending);

    expect(await redirectTarget(() => requireEntrepreneurPage())).toBe("/entrepreneur/application-status");
    const { business } = await requireEntrepreneurPage({ approvedOnly: false });
    expect(business.id).toBe(businessOf(pending).id);
  });

  it("returns the signed-in seller with only display details for the sidebar", async () => {
    const me = await createEntrepreneur();
    await signInAs(me);

    const { user, sidebar } = await requireEntrepreneurPage();

    expect(user.id).toBe(me.id);
    expect(sidebar).toEqual({ fullName: me.name, businessName: "Test Business", status: "APPROVED" });
    expect(JSON.stringify(user)).not.toMatch(/passwordHash|resetToken|sessionVersion/);
  });

  it("getSessionUser is the real session check (a tampered or missing cookie is no user)", async () => {
    signOut();
    expect(await getSessionUser()).toBeNull();
  });
});

describe("seller-scoped queries", () => {
  it("getOwnProducts lists only the seller's own products, with a plain-number price", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    const mine = await createProduct(businessOf(me).id, { price: 750 });
    await createProduct(businessOf(other).id);

    const products = await getOwnProducts(businessOf(me).id);

    expect(products.map((p) => p.id)).toEqual([mine.id]);
    expect(products[0].price).toBe(750);
    expect(typeof products[0].price).toBe("number");
  });

  it("getOwnProductForEdit returns null for another seller's product, a missing id or an invalid id", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    const theirs = await createProduct(businessOf(other).id);
    const mine = await createProduct(businessOf(me).id);

    expect(await getOwnProductForEdit(theirs.id, businessOf(me).id)).toBeNull();
    expect(await getOwnProductForEdit("does-not-exist", businessOf(me).id)).toBeNull();
    expect(await getOwnProductForEdit("'; DROP TABLE x; --", businessOf(me).id)).toBeNull();
    expect((await getOwnProductForEdit(mine.id, businessOf(me).id))?.id).toBe(mine.id);
  });

  it("getOwnOrderForProof returns null for another seller's order", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    const product = await createProduct(businessOf(other).id);
    const theirs = await createOrder(businessOf(other).id, product.id);

    expect(await getOwnOrderForProof(theirs.id, businessOf(me).id)).toBeNull();
    expect((await getOwnOrderForProof(theirs.id, businessOf(other).id))?.id).toBe(theirs.id);
  });

  it("getOwnOrders returns only the seller's orders, with stats worked out from them", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id);
    await createOrder(businessOf(me).id, product.id, "VERIFIED");
    await createOrder(businessOf(me).id, product.id, "PENDING");
    const otherProduct = await createProduct(businessOf(other).id);
    await createOrder(businessOf(other).id, otherProduct.id, "VERIFIED");

    const { orders, stats } = await getOwnOrders(businessOf(me).id);

    expect(orders).toHaveLength(2);
    expect(stats).toEqual({ totalRevenue: 500, averageOrderValue: 500, unitsDelivered: 1, pendingEscrow: 500 });
  });

  it("getOwnNotifications returns only the user's own notifications", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    const mine = await prisma.notification.create({ data: { userId: me.id, type: "ORDER", title: "a", message: "b" } });
    await prisma.notification.create({ data: { userId: other.id, type: "ORDER", title: "c", message: "d" } });

    expect((await getOwnNotifications(me.id)).map((n) => n.id)).toEqual([mine.id]);
  });
});

describe("computeOrderStats", () => {
  it("counts verified revenue, skips cancelled orders in the average, and sums open orders as escrow", () => {
    expect(
      computeOrderStats([
        { status: "VERIFIED", totalAmount: 1000, items: [{ quantity: 2 }] },
        { status: "PENDING", totalAmount: 300, items: [{ quantity: 1 }] },
        { status: "CANCELLED", totalAmount: 9999, items: [{ quantity: 1 }] },
      ])
    ).toEqual({ totalRevenue: 1000, averageOrderValue: 650, unitsDelivered: 2, pendingEscrow: 300 });
  });

  it("is all zeros with no orders", () => {
    expect(computeOrderStats([])).toEqual({ totalRevenue: 0, averageOrderValue: 0, unitsDelivered: 0, pendingEscrow: 0 });
  });
});
