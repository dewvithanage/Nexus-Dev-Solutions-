import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as listMyProducts, POST as createProductRoute } from "@/app/api/products/route";
import { GET as getMyProduct, PATCH as updateMyProduct } from "@/app/api/products/mine/[productId]/route";
import { POST as uploadImages } from "@/app/api/products/[productId]/images/route";
import { DELETE as deleteImage } from "@/app/api/products/mine/[productId]/images/[imageId]/route";
import { prisma } from "@/lib/prisma";
import {
  createAdmin,
  createCategory,
  createEntrepreneur,
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

// The entrepreneur's own products: POST/GET /api/products,
// GET/PATCH /api/products/mine/[productId],
// POST /api/products/[productId]/images and
// DELETE /api/products/mine/[productId]/images/[imageId].

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

const create = (body: unknown) => createProductRoute(jsonRequest("/api/products", "POST", body));
const read = (productId: string) =>
  getMyProduct(jsonRequest(`/api/products/mine/${productId}`, "GET"), routeParams({ productId }));
const patch = (productId: string, body: unknown) =>
  updateMyProduct(jsonRequest(`/api/products/mine/${productId}`, "PATCH", body), routeParams({ productId }));
const upload = (productId: string, files: File[]) => {
  const form = new FormData();
  files.forEach((file) => form.append("images", file));
  return uploadImages(formRequest(`/api/products/${productId}/images`, "POST", form), routeParams({ productId }));
};
const remove = (productId: string, imageId: string) =>
  deleteImage(
    jsonRequest(`/api/products/mine/${productId}/images/${imageId}`, "DELETE"),
    routeParams({ productId, imageId })
  );

async function newProductBody() {
  const category = await createCategory();
  return {
    name: "Crochet Bag",
    categoryId: category.id,
    description: "Hand-made tote bag",
    price: 1500.5,
    stockQuantity: 4,
    tags: ["bag", "handmade"],
  };
}

beforeEach(async () => {
  await removeUploadedTestFiles();
  await resetDatabase();
});

afterAll(removeUploadedTestFiles);

describe("POST /api/products", () => {
  it("401 without a session, 403 for an admin or a pending seller; nothing is created", async () => {
    const body = await newProductBody();
    expect((await create(body)).status).toBe(401);

    await signInAs(await createAdmin());
    expect((await create(body)).status).toBe(403);

    await signInAs(await createEntrepreneur("PENDING"));
    expect((await create(body)).status).toBe(403);

    expect(await prisma.product.count()).toBe(0);
  });

  it("creates a PENDING product in the caller's own business", async () => {
    const me = await createEntrepreneur();
    await signInAs(me);

    const response = await create(await newProductBody());

    expect(response.status).toBe(201);
    const { product } = await response.json();
    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved).toMatchObject({ businessId: businessOf(me).id, status: "PENDING", name: "Crochet Bag", stockQuantity: 4 });
    expect(Number(saved!.price)).toBe(1500.5);
  });

  it.each([
    ["businessId", (victimBusinessId: string) => ({ businessId: victimBusinessId })],
    ["status", () => ({ status: "APPROVED" })],
  ])("rejects an injected %s with 400 (no products in other shops, no self-approval)", async (_field, extra) => {
    const me = await createEntrepreneur();
    const victim = await createEntrepreneur();
    await signInAs(me);

    const response = await create({ ...(await newProductBody()), ...extra(businessOf(victim).id) });

    expect(response.status).toBe(400);
    expect(await prisma.product.count()).toBe(0);
  });

  it.each([
    ["a negative price", { price: -10 }],
    ["a price with 3 decimals", { price: 10.555 }],
    ["a negative stock", { stockQuantity: -1 }],
    ["a fractional stock", { stockQuantity: 1.5 }],
    ["a missing name", { name: "" }],
    ["a category that does not exist", { categoryId: "no-such-category" }],
  ])("rejects %s with 400", async (_label, change) => {
    await signInAs(await createEntrepreneur());
    expect((await create({ ...(await newProductBody()), ...change })).status).toBe(400);
    expect(await prisma.product.count()).toBe(0);
  });
});

describe("GET /api/products (My Products)", () => {
  it("401 without a session", async () => {
    expect((await listMyProducts()).status).toBe(401);
  });

  it("lists only the caller's products, in every status", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    const approved = await createProduct(businessOf(me).id, { status: "APPROVED" });
    const rejected = await createProduct(businessOf(me).id, { status: "REJECTED" });
    await createProduct(businessOf(other).id);
    await signInAs(me);

    const { products } = await (await listMyProducts()).json();

    expect(products.map((p: { id: string }) => p.id).sort()).toEqual([approved.id, rejected.id].sort());
  });
});

describe("GET/PATCH /api/products/mine/[productId]", () => {
  it("401 without a session", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id);
    expect((await read(product.id)).status).toBe(401);
    expect((await patch(product.id, { name: "x" })).status).toBe(401);
  });

  it("the owner can read their product in any status", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id, { status: "REJECTED" });
    await signInAs(me);

    const response = await read(product.id);

    expect(response.status).toBe(200);
    expect((await response.json()).product.id).toBe(product.id);
  });

  it("another entrepreneur gets 404 on read and edit, and the product is unchanged", async () => {
    const owner = await createEntrepreneur();
    const product = await createProduct(businessOf(owner).id);
    await signInAs(await createEntrepreneur());

    expect((await read(product.id)).status).toBe(404);
    expect((await patch(product.id, { name: "Hijacked", price: 1 })).status).toBe(404);

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved!.name).toBe(product.name);
    expect(Number(saved!.price)).toBe(500);
  });

  it("404 for a product that does not exist", async () => {
    await signInAs(await createEntrepreneur());
    expect((await patch("does-not-exist", { name: "x" })).status).toBe(404);
  });

  it("the owner's edit is saved and sends the product back for review", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id, { status: "APPROVED" });
    await signInAs(me);

    expect((await patch(product.id, { name: "Better Bag", price: 750, stockQuantity: 0 })).status).toBe(200);

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved).toMatchObject({ name: "Better Bag", stockQuantity: 0, status: "PENDING", rejectionReason: null });
    expect(Number(saved!.price)).toBe(750);
  });

  it.each([
    ["status", { status: "APPROVED" }],
    ["businessId", { businessId: "another-business" }],
    ["rejectionReason", { rejectionReason: null }],
  ])("rejects the unexpected field %s with 400 and changes nothing", async (_field, extra) => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id, { status: "REJECTED" });
    await signInAs(me);

    expect((await patch(product.id, { name: "Changed", ...extra })).status).toBe(400);

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved).toMatchObject({ name: product.name, status: "REJECTED", businessId: businessOf(me).id });
  });
});

describe("product images", () => {
  it("401 without a session", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id);
    expect((await upload(product.id, [tinyPngFile()])).status).toBe(401);
    expect((await remove(product.id, "any-image")).status).toBe(401);
  });

  it("the owner's images are saved to the database and to disk", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id);
    await signInAs(me);

    expect((await upload(product.id, [tinyPngFile(), tinyPngFile()])).status).toBe(201);

    const images = await prisma.productImage.findMany({ where: { productId: product.id } });
    expect(images).toHaveLength(2);
    images.forEach((image) => expect(uploadedFileExists(image.url)).toBe(true));
  });

  it("another entrepreneur cannot add images (404)", async () => {
    const owner = await createEntrepreneur();
    const product = await createProduct(businessOf(owner).id);
    await signInAs(await createEntrepreneur());

    expect((await upload(product.id, [tinyPngFile()])).status).toBe(404);
    expect(await prisma.productImage.count()).toBe(0);
  });

  it("rejects a fake image with 400, and a 5th image with 409", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id);
    await signInAs(me);

    expect((await upload(product.id, [fakePngFile()])).status).toBe(400);
    await upload(product.id, [tinyPngFile(), tinyPngFile(), tinyPngFile(), tinyPngFile()]);
    expect((await upload(product.id, [tinyPngFile()])).status).toBe(409);
    expect(await prisma.productImage.count({ where: { productId: product.id } })).toBe(4);
  });

  it("the owner can remove an image: the row and the file are deleted", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id);
    await signInAs(me);
    await upload(product.id, [tinyPngFile()]);
    const image = (await prisma.productImage.findFirst({ where: { productId: product.id } }))!;

    expect((await remove(product.id, image.id)).status).toBe(200);

    expect(await prisma.productImage.findUnique({ where: { id: image.id } })).toBeNull();
    expect(uploadedFileExists(image.url)).toBe(false);
  });

  it("another entrepreneur cannot remove the image (404), and it stays", async () => {
    const owner = await createEntrepreneur();
    const product = await createProduct(businessOf(owner).id);
    await signInAs(owner);
    await upload(product.id, [tinyPngFile()]);
    const image = (await prisma.productImage.findFirst({ where: { productId: product.id } }))!;

    await signInAs(await createEntrepreneur());
    expect((await remove(product.id, image.id)).status).toBe(404);

    expect(await prisma.productImage.findUnique({ where: { id: image.id } })).not.toBeNull();
  });

  it("an image id paired with another of the caller's products is 404", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id);
    const otherProduct = await createProduct(businessOf(me).id);
    await signInAs(me);
    await upload(product.id, [tinyPngFile()]);
    const image = (await prisma.productImage.findFirst({ where: { productId: product.id } }))!;

    expect((await remove(otherProduct.id, image.id)).status).toBe(404);
    expect(await prisma.productImage.findUnique({ where: { id: image.id } })).not.toBeNull();
  });

  it("a pending seller cannot remove images (403)", async () => {
    const me = await createEntrepreneur();
    const product = await createProduct(businessOf(me).id);
    const image = await prisma.productImage.create({ data: { productId: product.id, url: "/images/demo.png" } });
    await prisma.entrepreneurProfile.update({ where: { id: me.entrepreneurProfile!.id }, data: { status: "PENDING" } });
    await signInAs(me);

    expect((await remove(product.id, image.id)).status).toBe(403);
    expect(await prisma.productImage.findUnique({ where: { id: image.id } })).not.toBeNull();
  });
});
