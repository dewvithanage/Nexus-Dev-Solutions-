import { isValidElement, type ReactElement } from "react";
import { revalidateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SalesVerificationPage from "@/app/admin/sales/page";
import SalesConfirmationDetailsPage from "@/app/admin/sales/[orderId]/page";
import EntrepreneurRankingsPage from "@/app/admin/rankings/page";
import ReportsAnalyticsPage from "@/app/admin/reports/page";
import CategoryManagementPage from "@/app/admin/categories/page";
import ContentManagementPage from "@/app/admin/content/page";
import AdminNotificationsPage from "@/app/admin/notifications/page";
import AdminGalleryManagementPage from "@/app/admin/gallery/page";
import { PATCH as verifySale } from "@/app/api/admin/sales/[orderId]/verify/route";
import { PATCH as flagSale } from "@/app/api/admin/sales/[orderId]/flag/route";
import { SALES_TOTALS_TAG } from "@/lib/admin/cache-tags";
import { signOutEverywhere } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  createAdmin,
  createCategory,
  createEntrepreneur,
  createOrder,
  createProduct,
  jsonRequest,
  resetDatabase,
  routeParams,
  signInAs,
  signOut,
} from "./helpers";

// Admin pages 35–42 are Server Components: they check the session and load
// their data on the server, then hand it to a Client Component as props.

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;
const search = (params: Record<string, string> = {}) => ({ searchParams: Promise.resolve(params) });

// redirect() and notFound() work by throwing; this returns which one.
async function outcome(render: () => Promise<unknown>) {
  try {
    await render();
    return "rendered";
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return `redirect:${digest.split(";")[2]}`;
    if (/NOT_FOUND|;404$/.test(digest)) return "not-found";
    throw error;
  }
}

// The props the page hands to its Client Component.
async function viewProps(render: () => Promise<unknown>) {
  const element = await render();
  if (!isValidElement(element)) throw new Error("page did not return an element");
  return (element as ReactElement<Record<string, unknown>>).props;
}

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

const pages: [string, () => Promise<unknown>][] = [
  ["Sales Verification", () => SalesVerificationPage(search())],
  ["Sales Confirmation Details", () => SalesConfirmationDetailsPage({ params: Promise.resolve({ orderId: "x" }) })],
  ["Entrepreneur Rankings", () => EntrepreneurRankingsPage(search())],
  ["Reports & Analytics", () => ReportsAnalyticsPage()],
  ["Category Management", () => CategoryManagementPage(search())],
  ["Content Management", () => ContentManagementPage(search())],
  ["Admin Notifications", () => AdminNotificationsPage()],
  ["Admin Gallery Management", () => AdminGalleryManagementPage(search())],
];

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(revalidateTag).mockClear();
});

describe.each(pages)("%s page access", (_name, render) => {
  it("sends visitors without a session to the admin login", async () => {
    signOut();
    expect(await outcome(render)).toBe("redirect:/admin/login");
  });

  it("sends a signed-in entrepreneur to the admin login", async () => {
    await signInAs(await createEntrepreneur());
    expect(await outcome(render)).toBe("redirect:/admin/login");
  });

  it("refuses an admin session that was ended by logout", async () => {
    const admin = await createAdmin();
    await signInAs(admin);
    await signOutEverywhere(admin.id);

    expect(await outcome(render)).toBe("redirect:/admin/login");
  });
});

describe("Sales Verification page", () => {
  it("renders the orders on the server, defaulting to the Pending tab", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    const props = await viewProps(() => SalesVerificationPage(search()));

    expect(props.status).toBe("PENDING");
    const data = props.data as { orders: { id: string; totalAmount: number }[] };
    expect(data.orders.map((o) => o.id)).toEqual([order.id]);
    expect(data.orders[0].totalAmount).toBe(500);
    expect(JSON.stringify(props)).not.toContain("secret-guest-token");
  });

  it("uses the tab from the URL, and falls back to defaults for bad values", async () => {
    await saleAwaitingVerification();
    await signInAs(await createAdmin());

    const verified = await viewProps(() => SalesVerificationPage(search({ status: "VERIFIED" })));
    expect(verified.status).toBe("VERIFIED");
    expect((verified.data as { orders: unknown[] }).orders).toHaveLength(0);

    const bad = await viewProps(() => SalesVerificationPage(search({ status: "NOPE", page: "abc" })));
    expect(bad.status).toBe("PENDING");
    expect((bad.data as { pagination: { currentPage: number } }).pagination.currentPage).toBe(1);
  });
});

describe("Sales Confirmation Details page", () => {
  const render = (orderId: string) => () => SalesConfirmationDetailsPage({ params: Promise.resolve({ orderId }) });

  it("renders the order with its proof, without the guest access token", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    const props = await viewProps(render(order.id));
    const shown = props.order as { id: string; totalAmount: number; salesConfirmation: { proofImageUrl: string } };

    expect(shown.id).toBe(order.id);
    expect(shown.totalAmount).toBe(500);
    expect(shown.salesConfirmation.proofImageUrl).toBe("/uploads/proofs/proof.png");
    expect(JSON.stringify(props)).not.toContain("secret-guest-token");
  });

  it("shows not found for an unknown or malformed order id", async () => {
    await signInAs(await createAdmin());

    expect(await outcome(render("does-not-exist"))).toBe("not-found");
    expect(await outcome(render("../../etc"))).toBe("not-found");
  });
});

describe("Reports and Rankings pages", () => {
  it("render verified sales only", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    await createOrder(businessOf(seller).id, product.id, "VERIFIED");
    await createOrder(businessOf(seller).id, product.id, "PENDING");
    await signInAs(await createAdmin());

    const report = (await viewProps(ReportsAnalyticsPage)).report as { totalRevenue: number; totalOrders: number };
    expect(report.totalRevenue).toBe(500);
    expect(report.totalOrders).toBe(2);

    const rankings = await viewProps(() => EntrepreneurRankingsPage(search({ period: "all" })));
    expect(rankings.period).toBe("all");
    expect((rankings.data as { podium: { revenue: number }[] }).podium).toEqual([
      expect.objectContaining({ businessId: businessOf(seller).id, revenue: 500 }),
    ]);
  });

  it("clear the cached totals when a sale is verified", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    await verifySale(jsonRequest(`/api/admin/sales/${order.id}/verify`, "PATCH"), routeParams({ orderId: order.id }));

    expect(revalidateTag).toHaveBeenCalledWith(SALES_TOTALS_TAG);
  });

  it("clear the cached totals when a sale is flagged", async () => {
    const { order } = await saleAwaitingVerification();
    await signInAs(await createAdmin());

    await flagSale(jsonRequest(`/api/admin/sales/${order.id}/flag`, "PATCH"), routeParams({ orderId: order.id }));

    expect(revalidateTag).toHaveBeenCalledWith(SALES_TOTALS_TAG);
  });

  it("don't clear the cache when a verify is refused", async () => {
    const { seller, order } = await saleAwaitingVerification();
    await signInAs(seller);

    await verifySale(jsonRequest(`/api/admin/sales/${order.id}/verify`, "PATCH"), routeParams({ orderId: order.id }));

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("Category, Content and Gallery pages", () => {
  it("render the current data from the database", async () => {
    const admin = await createAdmin();
    const category = await createCategory("Crafts");
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    await prisma.review.create({ data: { productId: product.id, reviewerName: "Asha", rating: 5, comment: "Lovely" } });
    await prisma.galleryItem.create({ data: { imageUrl: "/uploads/gallery/x.png", caption: "Pitch night", uploadedById: admin.id } });
    await signInAs(admin);

    const categories = (await viewProps(() => CategoryManagementPage(search()))).data as { categories: { id: string }[] };
    expect(categories.categories.map((c) => c.id)).toContain(category.id);

    const reviews = (await viewProps(() => ContentManagementPage(search()))).data as { reviews: { reviewerName: string }[] };
    expect(reviews.reviews.map((r) => r.reviewerName)).toEqual(["Asha"]);

    const gallery = (await viewProps(() => AdminGalleryManagementPage(search()))).data as { items: { caption: string }[] };
    expect(gallery.items.map((i) => i.caption)).toEqual(["Pitch night"]);
  });
});

describe("Admin Notifications page", () => {
  it("renders only the signed-in admin's own notifications", async () => {
    const admin = await createAdmin();
    const notify = (userId: string) =>
      prisma.notification.create({ data: { userId, type: "REGISTRATION", title: "New", message: "Hello" } });
    const mine = await notify(admin.id);
    await notify((await createAdmin()).id);
    await notify((await createEntrepreneur()).id);
    await signInAs(admin);

    const props = await viewProps(AdminNotificationsPage);

    expect((props.notifications as { id: string }[]).map((n) => n.id)).toEqual([mine.id]);
  });
});
