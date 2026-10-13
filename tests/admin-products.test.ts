import { beforeEach, describe, expect, it } from "vitest";
import { GET as listProducts } from "@/app/api/admin/products/route";
import {
  GET as getProduct,
  PATCH as changeCategory,
  DELETE as deleteProduct,
} from "@/app/api/admin/products/[id]/route";
import { PATCH as approveProduct } from "@/app/api/admin/products/[id]/approve/route";
import { PATCH as rejectProduct } from "@/app/api/admin/products/[id]/reject/route";
import { PATCH as saveNotes } from "@/app/api/admin/products/[id]/notes/route";
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
} from "./helpers";

// Admin product endpoints (Product Approval, Admin Product Details and
// Product Management pages).

beforeEach(resetDatabase);

async function sellerWithProduct(
  sellerStatus: "PENDING" | "APPROVED" = "APPROVED",
  productStatus: "PENDING" | "APPROVED" | "REJECTED" = "PENDING"
) {
  const seller = await createEntrepreneur(sellerStatus);
  const product = await createProduct(seller.entrepreneurProfile!.business!.id, { status: productStatus });
  return { seller, product };
}

const productStatus = async (id: string) => (await prisma.product.findUniqueOrThrow({ where: { id } })).status;

describe("GET /api/admin/products", () => {
  it("rejects no session (401) and an entrepreneur (403)", async () => {
    expect((await listProducts(jsonRequest("/api/admin/products", "GET"))).status).toBe(401);
    await signInAs(await createEntrepreneur());
    expect((await listProducts(jsonRequest("/api/admin/products", "GET"))).status).toBe(403);
  });

  it("filters the approval queue by exact status", async () => {
    await sellerWithProduct("APPROVED", "PENDING");
    await sellerWithProduct("APPROVED", "APPROVED");
    await signInAs(await createAdmin());

    const body = await (await listProducts(jsonRequest("/api/admin/products?status=PENDING", "GET"))).json();

    expect(body.products).toHaveLength(1);
    expect(body.products[0].status).toBe("PENDING");
  });
});

describe("GET /api/admin/products/[id]", () => {
  it("never includes the seller's password hash or reset token", async () => {
    const { seller, product } = await sellerWithProduct();
    await prisma.user.update({ where: { id: seller.id }, data: { resetToken: "e".repeat(64) } });
    await signInAs(await createAdmin());

    const response = await getProduct(jsonRequest("/x", "GET"), routeParams({ id: product.id }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toMatch(/passwordHash|resetToken|\$2[aby]\$|e{64}/);
  });

  it("returns 404 for an unknown id", async () => {
    await signInAs(await createAdmin());
    expect((await getProduct(jsonRequest("/x", "GET"), routeParams({ id: "nope" }))).status).toBe(404);
  });
});

describe("PATCH /api/admin/products/[id]/approve", () => {
  it("rejects an entrepreneur approving their own product (403), status unchanged", async () => {
    const { seller, product } = await sellerWithProduct();
    await signInAs(seller);

    const response = await approveProduct(jsonRequest("/x", "PATCH"), routeParams({ id: product.id }));

    expect(response.status).toBe(403);
    expect(await productStatus(product.id)).toBe("PENDING");
  });

  it("approves and notifies the seller", async () => {
    const { seller, product } = await sellerWithProduct();
    await signInAs(await createAdmin());

    const response = await approveProduct(jsonRequest("/x", "PATCH"), routeParams({ id: product.id }));

    expect(response.status).toBe(200);
    expect(await productStatus(product.id)).toBe("APPROVED");
    expect(await prisma.notification.count({ where: { userId: seller.id, type: "PRODUCT" } })).toBe(1);
  });

  it("refuses (409) while the seller's registration isn't approved", async () => {
    const { product } = await sellerWithProduct("PENDING");
    await signInAs(await createAdmin());

    const response = await approveProduct(jsonRequest("/x", "PATCH"), routeParams({ id: product.id }));

    expect(response.status).toBe(409);
    expect(await productStatus(product.id)).toBe("PENDING");
  });

  it("returns 409 when already approved and 404 for an unknown id", async () => {
    const { product } = await sellerWithProduct("APPROVED", "APPROVED");
    await signInAs(await createAdmin());

    expect((await approveProduct(jsonRequest("/x", "PATCH"), routeParams({ id: product.id }))).status).toBe(409);
    expect((await approveProduct(jsonRequest("/x", "PATCH"), routeParams({ id: "nope" }))).status).toBe(404);
  });
});

describe("PATCH /api/admin/products/[id]/reject", () => {
  it("rejects with an empty body (quick reject) and with a reason", async () => {
    const first = await sellerWithProduct();
    const second = await sellerWithProduct();
    await signInAs(await createAdmin());

    expect((await rejectProduct(jsonRequest("/x", "PATCH"), routeParams({ id: first.product.id }))).status).toBe(200);
    const withReason = await rejectProduct(
      jsonRequest("/x", "PATCH", { rejectionReason: "Blurry photos" }),
      routeParams({ id: second.product.id })
    );

    expect(withReason.status).toBe(200);
    expect(await productStatus(first.product.id)).toBe("REJECTED");
    const saved = await prisma.product.findUniqueOrThrow({ where: { id: second.product.id } });
    expect(saved.rejectionReason).toBe("Blurry photos");
  });

  it("rejects a non-text reason with 400 and leaves the status unchanged", async () => {
    const { product } = await sellerWithProduct();
    await signInAs(await createAdmin());

    const response = await rejectProduct(
      jsonRequest("/x", "PATCH", { rejectionReason: { a: 1 } }),
      routeParams({ id: product.id })
    );

    expect(response.status).toBe(400);
    expect(await productStatus(product.id)).toBe("PENDING");
  });
});

describe("PATCH /api/admin/products/[id]/notes", () => {
  it("saves notes for an admin, and rejects an entrepreneur (403) without saving", async () => {
    const { seller, product } = await sellerWithProduct();

    await signInAs(seller);
    expect((await saveNotes(jsonRequest("/x", "PATCH", { adminNotes: "hack" }), routeParams({ id: product.id }))).status).toBe(403);

    await signInAs(await createAdmin());
    expect((await saveNotes(jsonRequest("/x", "PATCH", { adminNotes: "Check photos" }), routeParams({ id: product.id }))).status).toBe(200);

    const saved = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(saved.adminNotes).toBe("Check photos");
  });

  it("rejects notes over the length limit (400) and unknown ids (404)", async () => {
    const { product } = await sellerWithProduct();
    await signInAs(await createAdmin());

    expect((await saveNotes(jsonRequest("/x", "PATCH", { adminNotes: "x".repeat(2001) }), routeParams({ id: product.id }))).status).toBe(400);
    expect((await saveNotes(jsonRequest("/x", "PATCH", { adminNotes: "x" }), routeParams({ id: "nope" }))).status).toBe(404);
  });
});

describe("PATCH /api/admin/products/[id] (change category)", () => {
  it("moves the product to an existing category", async () => {
    const { product } = await sellerWithProduct();
    const target = await createCategory("Target Category");
    await signInAs(await createAdmin());

    const response = await changeCategory(jsonRequest("/x", "PATCH", { categoryId: target.id }), routeParams({ id: product.id }));

    expect(response.status).toBe(200);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).categoryId).toBe(target.id);
  });

  it("rejects an unknown category and extra fields with 400", async () => {
    const { product } = await sellerWithProduct();
    const target = await createCategory("Other");
    await signInAs(await createAdmin());

    expect((await changeCategory(jsonRequest("/x", "PATCH", { categoryId: "nope" }), routeParams({ id: product.id }))).status).toBe(400);
    expect(
      (await changeCategory(jsonRequest("/x", "PATCH", { categoryId: target.id, status: "APPROVED" }), routeParams({ id: product.id }))).status
    ).toBe(400);
    expect(await productStatus(product.id)).toBe("PENDING");
  });
});

describe("DELETE /api/admin/products/[id]", () => {
  it("refuses (409) to delete a product that has been ordered", async () => {
    const { seller, product } = await sellerWithProduct("APPROVED", "APPROVED");
    await createOrder(seller.entrepreneurProfile!.business!.id, product.id);
    await signInAs(await createAdmin());

    const response = await deleteProduct(jsonRequest("/x", "DELETE"), routeParams({ id: product.id }));

    expect(response.status).toBe(409);
    expect(await prisma.product.count({ where: { id: product.id } })).toBe(1);
  });

  it("deletes a product with no orders", async () => {
    const { product } = await sellerWithProduct();
    await signInAs(await createAdmin());

    const response = await deleteProduct(jsonRequest("/x", "DELETE"), routeParams({ id: product.id }));

    expect(response.status).toBe(200);
    expect(await prisma.product.count({ where: { id: product.id } })).toBe(0);
  });
});
