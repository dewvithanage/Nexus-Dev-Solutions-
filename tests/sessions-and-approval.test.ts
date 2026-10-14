import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as myOrders } from "@/app/api/orders/mine/route";
import { POST as addProduct } from "@/app/api/products/route";
import { GET as storefront } from "@/app/api/businesses/[businessId]/route";
import { GET as publicProduct } from "@/app/api/products/[productId]/route";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import {
  createCategory,
  createEntrepreneur,
  createProduct,
  jsonRequest,
  resetDatabase,
  routeParams,
  sessionTokenFor,
  signInAs,
  TEST_PASSWORD,
} from "./helpers";

// Shared rules: sessions really end, and only approved entrepreneurs can
// sell or appear publicly (the point of the registration approval feature).

const cookieJar = (globalThis as { __testCookieJar?: Map<string, string> }).__testCookieJar!;

beforeEach(resetDatabase);

describe("sessions", () => {
  it("a copied session token stops working after logout", async () => {
    const user = await createEntrepreneur();
    const copiedToken = await sessionTokenFor(user);
    cookieJar.set(SESSION_COOKIE_NAME, copiedToken);
    expect((await myOrders()).status).toBe(200);

    await logout();

    cookieJar.set(SESSION_COOKIE_NAME, copiedToken);
    expect((await myOrders()).status).toBe(401);
  });

  it("a rejected entrepreneur can't sign in (403) and gets no session cookie", async () => {
    const user = await createEntrepreneur("REJECTED");

    const response = await login(jsonRequest("/api/auth/login", "POST", { email: user.email, password: TEST_PASSWORD }));

    expect(response.status).toBe(403);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("normal queries never return password hashes", async () => {
    await createEntrepreneur();
    const users = await prisma.user.findMany({ include: { entrepreneurProfile: true } });
    expect(JSON.stringify(users)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe("approval is enforced", () => {
  it("a pending entrepreneur can sign in but can't add products (403, nothing saved)", async () => {
    const pending = await createEntrepreneur("PENDING");
    const category = await createCategory();

    const signIn = await login(jsonRequest("/api/auth/login", "POST", { email: pending.email, password: TEST_PASSWORD }));
    expect(signIn.status).toBe(200);

    await signInAs(pending);
    const response = await addProduct(
      jsonRequest("/api/products", "POST", {
        name: "Sneaky",
        categoryId: category.id,
        description: "x",
        price: 10,
        stockQuantity: 1,
      })
    );

    expect(response.status).toBe(403);
    expect(await prisma.product.count()).toBe(0);
  });

  it("an approved entrepreneur can add a product, which starts as PENDING in their own shop", async () => {
    const seller = await createEntrepreneur("APPROVED");
    const category = await createCategory();
    await signInAs(seller);

    const response = await addProduct(
      jsonRequest("/api/products", "POST", {
        name: "Cookies",
        categoryId: category.id,
        description: "Fresh",
        price: 250.5,
        stockQuantity: 4,
      })
    );

    expect(response.status).toBe(201);
    const saved = await prisma.product.findFirstOrThrow();
    expect(saved.status).toBe("PENDING");
    expect(saved.businessId).toBe(seller.entrepreneurProfile!.business!.id);
  });

  it.each([
    ["a status field", { status: "APPROVED" }],
    ["a negative price", { price: -5 }],
    ["a text price", { price: "abc" }],
    ["a fractional stock", { stockQuantity: 1.5 }],
  ])("adding a product with %s is rejected with 400", async (_label, override) => {
    const seller = await createEntrepreneur("APPROVED");
    const category = await createCategory();
    await signInAs(seller);

    const response = await addProduct(
      jsonRequest("/api/products", "POST", {
        name: "Cookies",
        categoryId: category.id,
        description: "Fresh",
        price: 100,
        stockQuantity: 1,
        ...override,
      })
    );

    expect(response.status).toBe(400);
    expect(await prisma.product.count()).toBe(0);
  });

  it("a pending entrepreneur's storefront and products are not public (404)", async () => {
    const pending = await createEntrepreneur("PENDING");
    const businessId = pending.entrepreneurProfile!.business!.id;
    // Even a product marked APPROVED stays hidden while its seller isn't.
    const product = await createProduct(businessId, { status: "APPROVED" });

    expect((await storefront(jsonRequest("/x", "GET"), routeParams({ businessId }))).status).toBe(404);
    expect((await publicProduct(jsonRequest("/x", "GET"), routeParams({ productId: product.id }))).status).toBe(404);
  });

  it("an approved seller's product page doesn't expose admin notes", async () => {
    const seller = await createEntrepreneur("APPROVED");
    const product = await createProduct(seller.entrepreneurProfile!.business!.id, { status: "APPROVED" });
    await prisma.product.update({ where: { id: product.id }, data: { adminNotes: "internal only" } });

    const response = await publicProduct(jsonRequest("/x", "GET"), routeParams({ productId: product.id }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).not.toContain("internal only");
    expect(text).not.toContain("adminNotes");
  });
});
