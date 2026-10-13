import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import AdminDashboardPage from "@/app/admin/page";
import AdminDashboardBody from "@/components/admin/AdminDashboardBody";
import { signOutEverywhere } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createAdmin, createEntrepreneur, createOrder, createProduct, resetDatabase, signInAs, signOut } from "./helpers";

// Admin Dashboard page (server-rendered straight from the database).

beforeEach(resetDatabase);

// next/navigation's redirect() works by throwing; this returns where to.
async function redirectTarget(render: () => Promise<unknown>) {
  try {
    await render();
    return null;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw error;
    return digest.split(";")[2];
  }
}

// The figures the page hands to its dashboard body component.
function findDashboardProps(node: ReactNode): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findDashboardProps(child);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === AdminDashboardBody) return element.props as Record<string, unknown>;
  return findDashboardProps(element.props.children);
}

describe("Admin Dashboard page", () => {
  it("sends visitors without a session, and entrepreneurs, to the admin login", async () => {
    signOut();
    expect(await redirectTarget(AdminDashboardPage)).toBe("/admin/login");

    await signInAs(await createEntrepreneur());
    expect(await redirectTarget(AdminDashboardPage)).toBe("/admin/login");
  });

  it("refuses an admin session that was ended by logout, even with a validly signed cookie", async () => {
    const admin = await createAdmin();
    await signInAs(admin);
    expect(await redirectTarget(AdminDashboardPage)).toBeNull();

    // The cookie in the jar is still validly signed; the session is revoked.
    await signOutEverywhere(admin.id);

    expect(await redirectTarget(AdminDashboardPage)).toBe("/admin/login");
  });

  it("shows real counts, and counts only admin-verified sales as revenue", async () => {
    const approved = await createEntrepreneur("APPROVED");
    await createEntrepreneur("PENDING");
    await createEntrepreneur("PENDING");
    const businessId = approved.entrepreneurProfile!.business!.id;

    const live = await createProduct(businessId, { status: "APPROVED" });
    await createProduct(businessId, { status: "PENDING" });

    await createOrder(businessId, live.id, "VERIFIED"); // Rs.500, counts as revenue
    await createOrder(businessId, live.id, "PENDING"); // placed, not verified
    const cancelled = await createOrder(businessId, live.id, "PENDING");
    await prisma.order.update({ where: { id: cancelled.id }, data: { status: "CANCELLED" } });

    const admin = await createAdmin();
    await signInAs(admin);

    const props = findDashboardProps(await AdminDashboardPage());

    expect(props).toMatchObject({
      adminName: admin.name,
      totalEntrepreneurs: 3,
      pendingEntrepreneurs: 2,
      activeProducts: 1,
      pendingProducts: 1,
      totalSalesVolume: 500,
      ordersCount: 2,
    });
  });

  it("lists recent registrations and product submissions without any account secrets", async () => {
    const seller = await createEntrepreneur("PENDING");
    await createProduct(seller.entrepreneurProfile!.business!.id, { status: "PENDING" });
    await signInAs(await createAdmin());

    const props = findDashboardProps(await AdminDashboardPage());

    const activity = props!.activity as { type: string }[];
    expect(activity.map((event) => event.type).sort()).toEqual(["Product Submit", "Registration"]);
    expect(JSON.stringify(props)).not.toMatch(/passwordHash|resetToken|\$2[aby]\$/);
  });
});
