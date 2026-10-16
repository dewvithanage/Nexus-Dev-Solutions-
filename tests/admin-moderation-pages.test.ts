import { isValidElement, type ReactElement, type ReactNode } from "react";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EntrepreneurManagementPage from "@/app/admin/entrepreneurs/page";
import EntrepreneurRegistrationApprovalPage from "@/app/admin/entrepreneurs/approvals/page";
import EntrepreneurDetailsPage, { generateMetadata as entrepreneurMetadata } from "@/app/admin/entrepreneurs/[id]/page";
import ProductManagementPage from "@/app/admin/products/page";
import ProductApprovalPage from "@/app/admin/products/approvals/page";
import AdminProductDetailsPage, { generateMetadata as productMetadata } from "@/app/admin/products/[id]/page";
import EntrepreneurDecisionBar from "@/components/admin/entrepreneurs/EntrepreneurDecisionBar";
import { AdminNotesForm, CategorySelect } from "@/components/admin/products/ProductModerationControls";
import { PATCH as approveEntrepreneur } from "@/app/api/admin/entrepreneurs/[id]/approve/route";
import { DELETE as deleteEntrepreneur } from "@/app/api/admin/entrepreneurs/[id]/route";
import { PATCH as approveProduct } from "@/app/api/admin/products/[id]/approve/route";
import { PATCH as rejectProduct } from "@/app/api/admin/products/[id]/reject/route";
import { PATCH as saveNotes } from "@/app/api/admin/products/[id]/notes/route";
import { DELETE as deleteProduct, PATCH as changeCategory } from "@/app/api/admin/products/[id]/route";
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

// Admin pages 29–34 (Entrepreneur Registration Approval, Entrepreneur
// Details, Entrepreneur Management, Product Approval, Admin Product
// Details, Product Management) are Server Components: they check the
// session and load their data on the server, then hand plain data to
// Client Components as props.

const search = (params: Record<string, string> = {}) => ({ searchParams: Promise.resolve(params) });
const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;
const SECRETS = /passwordHash|resetToken|sessionVersion|\$2[aby]\$/;

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

// The props a list page hands to its Client Component.
async function viewProps(render: () => Promise<unknown>) {
  const element = await render();
  if (!isValidElement(element)) throw new Error("page did not return an element");
  return (element as ReactElement<Record<string, unknown>>).props;
}

// Props of the first element of this component type in a rendered tree.
function findProps(node: ReactNode, type: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findProps(child, type);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) return element.props as Record<string, unknown>;
  return findProps(element.props.children, type);
}

// Every text value passed anywhere in a rendered tree (props of every
// element, including those handed to Client Components).
function treeText(node: unknown, seen = new Set<unknown>()): string {
  if (node === null || node === undefined || typeof node === "function") return "";
  if (typeof node !== "object") return String(node) + " ";
  if (seen.has(node)) return "";
  seen.add(node);
  if (Array.isArray(node)) return node.map((child) => treeText(child, seen)).join("");
  const source = isValidElement(node) ? (node.props as Record<string, unknown>) : (node as Record<string, unknown>);
  return Object.entries(source)
    .filter(([key]) => !key.startsWith("_"))
    .map(([key, value]) => key + " " + treeText(value, seen))
    .join("");
}

const pages: [string, () => Promise<unknown>][] = [
  ["Entrepreneur Management", () => EntrepreneurManagementPage(search())],
  ["Entrepreneur Registration Approval", () => EntrepreneurRegistrationApprovalPage(search())],
  ["Entrepreneur Details", () => EntrepreneurDetailsPage(routeParams({ id: "x" }))],
  ["Product Management", () => ProductManagementPage(search())],
  ["Product Approval", () => ProductApprovalPage(search())],
  ["Admin Product Details", () => AdminProductDetailsPage(routeParams({ id: "x" }))],
];

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(revalidatePath).mockClear();
});

describe.each(pages)("%s page access", (_name, render) => {
  it("sends visitors without a session, and entrepreneurs, to the admin login", async () => {
    signOut();
    expect(await outcome(render)).toBe("redirect:/admin/login");

    await signInAs(await createEntrepreneur());
    expect(await outcome(render)).toBe("redirect:/admin/login");
  });

  it("refuses an admin session that was ended by logout, even with a validly signed cookie", async () => {
    const admin = await createAdmin();
    await signInAs(admin);
    await signOutEverywhere(admin.id);

    expect(await outcome(render)).toBe("redirect:/admin/login");
  });
});

describe("Entrepreneur Registration Approval page", () => {
  it("shows pending applications by default, with the real pending total across all pages", async () => {
    for (let i = 0; i < 12; i++) await createEntrepreneur("PENDING");
    await createEntrepreneur("APPROVED");
    await signInAs(await createAdmin());

    const props = await viewProps(() => EntrepreneurRegistrationApprovalPage(search()));
    const data = props.data as { entrepreneurs: { status: string }[]; pagination: { totalCount: number } };

    expect(props.status).toBe("PENDING");
    expect(props.pendingCount).toBe(12);
    expect(data.entrepreneurs).toHaveLength(10); // one page, not the whole table
    expect(data.entrepreneurs.every((row) => row.status === "PENDING")).toBe(true);
    expect(data.pagination.totalCount).toBe(12);
  });

  it("reads the tab and page from the URL, and falls back to defaults for bad values", async () => {
    await createEntrepreneur("PENDING");
    await createEntrepreneur("REJECTED");
    await signInAs(await createAdmin());

    const rejected = await viewProps(() => EntrepreneurRegistrationApprovalPage(search({ status: "REJECTED" })));
    expect((rejected.data as { entrepreneurs: { status: string }[] }).entrepreneurs.map((r) => r.status)).toEqual([
      "REJECTED",
    ]);

    const bad = await viewProps(() =>
      EntrepreneurRegistrationApprovalPage(search({ status: "DROP TABLE", page: "abc", pageSize: "100000" }))
    );
    expect(bad.status).toBe("PENDING");
  });

  it("passes only plain data with no account secrets", async () => {
    const pending = await createEntrepreneur("PENDING");
    await prisma.user.update({ where: { id: pending.id }, data: { resetToken: "a".repeat(64) } });
    await signInAs(await createAdmin());

    const props = await viewProps(() => EntrepreneurRegistrationApprovalPage(search()));
    const json = JSON.stringify(props);

    expect(json).not.toMatch(SECRETS);
    expect(json).not.toContain("a".repeat(64));
    expect(json).not.toContain(pending.email); // the list doesn't need emails
  });
});

describe("Entrepreneur Management page", () => {
  it("searches in the database across every page, not just the current one", async () => {
    for (let i = 0; i < 11; i++) await createEntrepreneur();
    const target = await createEntrepreneur();
    await prisma.business.update({ where: { id: businessOf(target).id }, data: { businessName: "Kandy Batik Studio" } });
    await signInAs(await createAdmin());

    const props = await viewProps(() => EntrepreneurManagementPage(search({ search: "batik" })));
    const data = props.data as { entrepreneurs: { businessName: string }[] };

    expect(props.search).toBe("batik");
    expect(data.entrepreneurs.map((row) => row.businessName)).toEqual(["Kandy Batik Studio"]);
  });

  it("counts only verified sales as sales volume", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    await createOrder(businessOf(seller).id, product.id, "VERIFIED");
    await createOrder(businessOf(seller).id, product.id, "PENDING");
    await signInAs(await createAdmin());

    const props = await viewProps(() => EntrepreneurManagementPage(search()));
    const [row] = (props.data as { entrepreneurs: { salesVolume: number; productCount: number }[] }).entrepreneurs;

    expect(row).toMatchObject({ salesVolume: 500, productCount: 1 });
  });
});

describe("Entrepreneur Details page", () => {
  it("shows the application with contact details for the admin, but no account secrets", async () => {
    const applicant = await createEntrepreneur("PENDING");
    await signInAs(await createAdmin());

    const tree = await EntrepreneurDetailsPage(routeParams({ id: applicant.entrepreneurProfile!.id }));

    expect(findProps(tree, EntrepreneurDecisionBar)).toMatchObject({ status: "PENDING", name: applicant.name });
    const json = treeText(tree);
    expect(json).toContain(applicant.email);
    expect(json).not.toMatch(SECRETS);
  });

  it("shows the not-found page for an unknown or malformed id", async () => {
    await signInAs(await createAdmin());
    expect(await outcome(() => EntrepreneurDetailsPage(routeParams({ id: "doesnotexist" })))).toBe("not-found");
    expect(await outcome(() => EntrepreneurDetailsPage(routeParams({ id: "../../etc" })))).toBe("not-found");
  });

  it("titles the tab with the business name, and checks the session first", async () => {
    const applicant = await createEntrepreneur("PENDING");
    const id = applicant.entrepreneurProfile!.id;

    signOut();
    expect(await outcome(() => entrepreneurMetadata(routeParams({ id })))).toBe("redirect:/admin/login");

    await signInAs(await createAdmin());
    expect((await entrepreneurMetadata(routeParams({ id }))).title).toBe("Test Business | StartupSpark Admin");
  });
});

describe("Product Approval page", () => {
  it("shows pending submissions by default, one page at a time", async () => {
    const seller = await createEntrepreneur();
    for (let i = 0; i < 11; i++) await createProduct(businessOf(seller).id, { status: "PENDING" });
    await createProduct(businessOf(seller).id, { status: "APPROVED" });
    await signInAs(await createAdmin());

    const props = await viewProps(() => ProductApprovalPage(search()));
    const data = props.data as { products: { status: string }[]; pagination: { totalCount: number; totalPages: number } };

    expect(props.status).toBe("PENDING");
    expect(data.products).toHaveLength(10);
    expect(data.products.every((row) => row.status === "PENDING")).toBe(true);
    expect(data.pagination).toMatchObject({ totalCount: 11, totalPages: 2 });
  });

  it("passes prices as plain numbers and dates as ISO strings", async () => {
    const seller = await createEntrepreneur();
    await createProduct(businessOf(seller).id, { status: "PENDING", price: 1250 });
    await signInAs(await createAdmin());

    const [row] = ((await viewProps(() => ProductApprovalPage(search()))).data as { products: Record<string, unknown>[] })
      .products;

    expect(row.price).toBe(1250);
    expect(typeof row.createdAt).toBe("string");
  });
});

describe("Product Management page", () => {
  it("shows the rejected tab and searches by product name in the database", async () => {
    const seller = await createEntrepreneur();
    const rejected = await createProduct(businessOf(seller).id, { status: "REJECTED" });
    await createProduct(businessOf(seller).id, { status: "APPROVED" });
    await signInAs(await createAdmin());

    const tab = await viewProps(() => ProductManagementPage(search({ tab: "REJECTED" })));
    expect((tab.data as { products: { id: string }[] }).products.map((p) => p.id)).toEqual([rejected.id]);

    const found = await viewProps(() => ProductManagementPage(search({ search: rejected.name, tab: "REJECTED" })));
    expect((found.data as { products: { name: string }[] }).products.map((p) => p.name)).toEqual([rejected.name]);
  });
});

describe("Admin Product Details page", () => {
  it("shows the product with its notes and category choices, without the seller's email or secrets", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id, { status: "PENDING" });
    await prisma.product.update({ where: { id: product.id }, data: { adminNotes: "Check the photos" } });
    await createCategory("Food");
    await signInAs(await createAdmin());

    const tree = await AdminProductDetailsPage(routeParams({ id: product.id }));

    expect(findProps(tree, AdminNotesForm)).toMatchObject({ initialNotes: "Check the photos" });
    const categories = findProps(tree, CategorySelect)!.categories as { name: string }[];
    expect(categories.map((c) => c.name)).toContain("Food");
    const json = treeText(tree);
    expect(json).not.toContain(seller.email);
    expect(json).not.toMatch(SECRETS);
  });

  it("shows the not-found page for an unknown id", async () => {
    await signInAs(await createAdmin());
    expect(await outcome(() => AdminProductDetailsPage(routeParams({ id: "nope" })))).toBe("not-found");
  });

  it("titles the tab with the product name", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    await signInAs(await createAdmin());

    expect((await productMetadata(routeParams({ id: product.id }))).title).toBe(`${product.name} | StartupSpark Admin`);
  });
});

describe("changes show straight away (cache revalidation)", () => {
  it("approving an entrepreneur clears the cached pages, including the public site", async () => {
    const pending = await createEntrepreneur("PENDING");
    await signInAs(await createAdmin());

    const response = await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id: pending.entrepreneurProfile!.id }));

    expect(response.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it.each([
    ["approving", (id: string) => approveProduct(jsonRequest("/x", "PATCH"), routeParams({ id }))],
    ["rejecting", (id: string) => rejectProduct(jsonRequest("/x", "PATCH", {}), routeParams({ id }))],
    ["deleting", (id: string) => deleteProduct(jsonRequest("/x", "DELETE"), routeParams({ id }))],
  ])("%s a product clears the cached pages", async (_label, act) => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id, { status: "PENDING" });
    await signInAs(await createAdmin());

    expect((await act(product.id)).status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("moving a product to another category clears the cached pages", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    const food = await createCategory("Food");
    await signInAs(await createAdmin());

    const response = await changeCategory(jsonRequest("/x", "PATCH", { categoryId: food.id }), routeParams({ id: product.id }));

    expect(response.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("saving internal notes refreshes only the admin pages", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    await signInAs(await createAdmin());

    await saveNotes(jsonRequest("/x", "PATCH", { adminNotes: "ok" }), routeParams({ id: product.id }));

    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
    expect(revalidatePath).not.toHaveBeenCalledWith("/", "layout");
  });

  it("a refused change (not an admin, or blocked by order history) clears nothing", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    await createOrder(businessOf(seller).id, product.id, "VERIFIED");

    await signInAs(seller);
    expect((await deleteEntrepreneur(jsonRequest("/x", "DELETE"), routeParams({ id: seller.entrepreneurProfile!.id }))).status).toBe(403);

    await signInAs(await createAdmin());
    expect((await deleteProduct(jsonRequest("/x", "DELETE"), routeParams({ id: product.id }))).status).toBe(409);

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
