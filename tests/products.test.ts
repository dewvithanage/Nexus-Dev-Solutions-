import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { GET as listMyProducts, POST as createProduct } from "@/app/api/products/route";
import { GET as getMyProduct, PATCH as updateMyProduct } from "@/app/api/products/mine/[productId]/route";
import { POST as uploadImages } from "@/app/api/products/[productId]/images/route";
import { DELETE as deleteImage } from "@/app/api/products/mine/[productId]/images/[imageId]/route";
import {
  createAdmin,
  createCategory,
  createEntrepreneur,
  createProduct as insertProduct,
  fakePngFile,
  formRequest,
  getRequest,
  jsonRequest,
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

function newProductBody(categoryId: string) {
  return {
    name: "Crochet Bag",
    categoryId,
    description: "Hand-made tote bag",
    price: 1500.5,
    stockQuantity: 4,
    onCampusPickup: true,
    areaDropOff: false,
    postingEnabled: false,
    tags: ["bag", "handmade"],
  };
}

describe("POST /api/products", () => {
  it("401 without a session, and no product is created", async () => {
    const category = await createCategory();
    const response = await createProduct(jsonRequest("/api/products", "POST", newProductBody(category.id)));
    expect(response.status).toBe(401);
    expect(await prisma.product.count()).toBe(0);
  });

  it("403 for a signed-in admin", async () => {
    const category = await createCategory();
    await signInAs(await createAdmin());
    const response = await createProduct(jsonRequest("/api/products", "POST", newProductBody(category.id)));
    expect(response.status).toBe(403);
    expect(await prisma.product.count()).toBe(0);
  });

  it("creates a PENDING product in the caller's own business and alerts admins", async () => {
    const category = await createCategory();
    const admin = await createAdmin();
    const { user, business } = await createEntrepreneur();
    await signInAs(user);

    const response = await createProduct(jsonRequest("/api/products", "POST", newProductBody(category.id)));
    expect(response.status).toBe(201);
    const { product } = await response.json();

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved).toMatchObject({
      businessId: business.id,
      status: "PENDING",
      name: "Crochet Bag",
      stockQuantity: 4,
      onCampusPickup: true,
      tags: ["bag", "handmade"],
    });
    expect(Number(saved!.price)).toBe(1500.5);
    expect(await prisma.notification.count({ where: { userId: admin.id, type: "PRODUCT_ALERT" } })).toBe(1);
  });

  it("rejects a businessId in the body (cannot add products to another shop)", async () => {
    const category = await createCategory();
    const mine = await createEntrepreneur();
    const victim = await createEntrepreneur();
    await signInAs(mine.user);

    const response = await createProduct(
      jsonRequest("/api/products", "POST", { ...newProductBody(category.id), businessId: victim.business.id })
    );
    expect(response.status).toBe(400);
    expect(await prisma.product.count({ where: { businessId: victim.business.id } })).toBe(0);
  });

  it("rejects a status field (cannot self-approve)", async () => {
    const category = await createCategory();
    const { user } = await createEntrepreneur();
    await signInAs(user);

    const response = await createProduct(
      jsonRequest("/api/products", "POST", { ...newProductBody(category.id), status: "APPROVED" })
    );
    expect(response.status).toBe(400);
    expect(await prisma.product.count()).toBe(0);
  });

  it.each([
    ["a zero price", { price: 0 }],
    ["a negative price", { price: -10 }],
    ["a price with 3 decimals", { price: 10.555 }],
    ["a price sent as text", { price: "100" }],
    ["a negative stock", { stockQuantity: -1 }],
    ["a fractional stock", { stockQuantity: 1.5 }],
    ["a missing name", { name: "" }],
    ["a missing description", { description: undefined }],
    ["too many tags", { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }],
  ])("rejects %s with 400", async (_label, change) => {
    const category = await createCategory();
    const { user } = await createEntrepreneur();
    await signInAs(user);

    const response = await createProduct(
      jsonRequest("/api/products", "POST", { ...newProductBody(category.id), ...change })
    );
    expect(response.status).toBe(400);
    expect(await prisma.product.count()).toBe(0);
  });

  it("rejects a category that does not exist with 400 (not a 500)", async () => {
    const { user } = await createEntrepreneur();
    await signInAs(user);
    const response = await createProduct(jsonRequest("/api/products", "POST", newProductBody("no-such-category")));
    expect(response.status).toBe(400);
  });
});

describe("GET /api/products (my products)", () => {
  it("401 without a session", async () => {
    expect((await listMyProducts()).status).toBe(401);
  });

  it("lists only the caller's products, in every status", async () => {
    const category = await createCategory();
    const mine = await createEntrepreneur();
    const other = await createEntrepreneur();
    const approved = await insertProduct(mine.business.id, category.id, { status: "APPROVED" });
    const rejected = await insertProduct(mine.business.id, category.id, { status: "REJECTED" });
    await insertProduct(other.business.id, category.id);
    await signInAs(mine.user);

    const { products } = await (await listMyProducts()).json();
    expect(products.map((product: { id: string }) => product.id).sort()).toEqual([approved.id, rejected.id].sort());
  });
});

describe("GET/PATCH /api/products/mine/[productId]", () => {
  async function setup() {
    const category = await createCategory();
    const owner = await createEntrepreneur();
    const intruder = await createEntrepreneur();
    const product = await insertProduct(owner.business.id, category.id, {
      status: "REJECTED",
      rejectionReason: "Blurry photo",
    });
    return { category, owner, intruder, product };
  }

  const patch = (productId: string, body: unknown) =>
    updateMyProduct(jsonRequest(`/api/products/mine/${productId}`, "PATCH", body), params({ productId }));

  it("401 without a session", async () => {
    const { product } = await setup();
    const response = await getMyProduct(getRequest(`/api/products/mine/${product.id}`), params({ productId: product.id }));
    expect(response.status).toBe(401);
    expect((await patch(product.id, { name: "x" })).status).toBe(401);
  });

  it("403 for a signed-in admin", async () => {
    const { product } = await setup();
    await signInAs(await createAdmin());
    expect((await patch(product.id, { name: "x" })).status).toBe(403);
  });

  it("the owner can read their own product in any status", async () => {
    const { owner, product } = await setup();
    await signInAs(owner.user);
    const response = await getMyProduct(getRequest(`/api/products/mine/${product.id}`), params({ productId: product.id }));
    expect(response.status).toBe(200);
    expect((await response.json()).product.id).toBe(product.id);
  });

  it("another entrepreneur gets 404 on read and on edit, and the product is unchanged", async () => {
    const { intruder, product } = await setup();
    await signInAs(intruder.user);

    const read = await getMyProduct(getRequest(`/api/products/mine/${product.id}`), params({ productId: product.id }));
    expect(read.status).toBe(404);

    const edit = await patch(product.id, { name: "Hijacked", price: 1 });
    expect(edit.status).toBe(404);

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved!.name).toBe(product.name);
    expect(Number(saved!.price)).toBe(500);
  });

  it("404 for a product id that does not exist", async () => {
    const { owner } = await setup();
    await signInAs(owner.user);
    expect((await patch("does-not-exist", { name: "x" })).status).toBe(404);
  });

  it("the owner's edit is saved and resubmits the product for review", async () => {
    const { owner, product } = await setup();
    await signInAs(owner.user);

    const response = await patch(product.id, { name: "Better Bag", price: 750, stockQuantity: 0 });
    expect(response.status).toBe(200);

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved).toMatchObject({ name: "Better Bag", stockQuantity: 0, status: "PENDING", rejectionReason: null });
    expect(Number(saved!.price)).toBe(750);
  });

  it.each([
    ["status", { status: "APPROVED" }],
    ["businessId", { businessId: "another-business" }],
    ["rejectionReason", { rejectionReason: null }],
    ["reviewedById", { reviewedById: "x" }],
  ])("rejects the unexpected field %s with 400 and changes nothing", async (_field, body) => {
    const { owner, product } = await setup();
    await signInAs(owner.user);

    const response = await patch(product.id, { name: "Changed", ...body });
    expect(response.status).toBe(400);

    const saved = await prisma.product.findUnique({ where: { id: product.id } });
    expect(saved).toMatchObject({ name: product.name, status: "REJECTED", businessId: owner.business.id });
  });

  it.each([
    ["an empty body", {}],
    ["a negative price", { price: -1 }],
    ["a fractional stock", { stockQuantity: 2.5 }],
    ["an unknown category", { categoryId: "no-such-category" }],
  ])("rejects %s with 400", async (_label, body) => {
    const { owner, product } = await setup();
    await signInAs(owner.user);
    expect((await patch(product.id, body)).status).toBe(400);
    expect((await prisma.product.findUnique({ where: { id: product.id } }))!.status).toBe("REJECTED");
  });
});

describe("product images", () => {
  async function setup() {
    const category = await createCategory();
    const owner = await createEntrepreneur();
    const intruder = await createEntrepreneur();
    const product = await insertProduct(owner.business.id, category.id);
    return { owner, intruder, product };
  }

  function imagesForm(productId: string, files: File[]) {
    const form = new FormData();
    files.forEach((file) => form.append("images", file));
    return formRequest(`/api/products/${productId}/images`, form);
  }

  const upload = (productId: string, files: File[]) => uploadImages(imagesForm(productId, files), params({ productId }));
  const remove = (productId: string, imageId: string) =>
    deleteImage(jsonRequest(`/api/products/mine/${productId}/images/${imageId}`, "DELETE"), params({ productId, imageId }));

  it("401 without a session", async () => {
    const { product } = await setup();
    expect((await upload(product.id, [pngFile()])).status).toBe(401);
  });

  it("the owner can upload images, which are saved to the database and disk", async () => {
    const { owner, product } = await setup();
    await signInAs(owner.user);

    const response = await upload(product.id, [pngFile(), pngFile()]);
    expect(response.status).toBe(201);

    const images = await prisma.productImage.findMany({ where: { productId: product.id }, orderBy: { sortOrder: "asc" } });
    expect(images).toHaveLength(2);
    expect(images.map((image) => image.sortOrder)).toEqual([0, 1]);
    images.forEach((image) => expect(uploadedFileExists(image.url)).toBe(true));
  });

  it("another entrepreneur cannot attach images to the product (404)", async () => {
    const { intruder, product } = await setup();
    await signInAs(intruder.user);
    expect((await upload(product.id, [pngFile()])).status).toBe(404);
    expect(await prisma.productImage.count()).toBe(0);
  });

  it("rejects a non-image file with 400", async () => {
    const { owner, product } = await setup();
    await signInAs(owner.user);
    expect((await upload(product.id, [fakePngFile()])).status).toBe(400);
    expect(await prisma.productImage.count()).toBe(0);
  });

  it("returns 409 once the product already has 4 images", async () => {
    const { owner, product } = await setup();
    await signInAs(owner.user);
    await upload(product.id, [pngFile(), pngFile(), pngFile(), pngFile()]);

    expect((await upload(product.id, [pngFile()])).status).toBe(409);
    expect(await prisma.productImage.count({ where: { productId: product.id } })).toBe(4);
  });

  it("the owner can remove an image: the row and the file are deleted", async () => {
    const { owner, product } = await setup();
    await signInAs(owner.user);
    await upload(product.id, [pngFile()]);
    const image = (await prisma.productImage.findFirst({ where: { productId: product.id } }))!;

    const response = await remove(product.id, image.id);
    expect(response.status).toBe(200);
    expect(await prisma.productImage.findUnique({ where: { id: image.id } })).toBeNull();
    expect(uploadedFileExists(image.url)).toBe(false);
  });

  it("another entrepreneur cannot remove the image (404), and it stays", async () => {
    const { owner, intruder, product } = await setup();
    await signInAs(owner.user);
    await upload(product.id, [pngFile()]);
    const image = (await prisma.productImage.findFirst({ where: { productId: product.id } }))!;

    await signInAs(intruder.user);
    expect((await remove(product.id, image.id)).status).toBe(404);
    expect(await prisma.productImage.findUnique({ where: { id: image.id } })).not.toBeNull();
  });

  it("an image id paired with a different product of the caller is 404", async () => {
    const { owner, product } = await setup();
    const category = await createCategory();
    const otherProduct = await insertProduct(owner.business.id, category.id);
    await signInAs(owner.user);
    await upload(product.id, [pngFile()]);
    const image = (await prisma.productImage.findFirst({ where: { productId: product.id } }))!;

    expect((await remove(otherProduct.id, image.id)).status).toBe(404);
  });

  it("401 when removing without a session", async () => {
    const { product } = await setup();
    expect((await remove(product.id, "any")).status).toBe(401);
  });
});
