import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as listCategories, POST as createCategoryRoute } from "@/app/api/admin/categories/route";
import { PATCH as renameCategory, DELETE as deleteCategory } from "@/app/api/admin/categories/[id]/route";
import { prisma } from "@/lib/prisma";
import {
  createAdmin,
  createCategory,
  createEntrepreneur,
  createProduct,
  jsonRequest,
  resetDatabase,
  routeParams,
  signInAs,
} from "./helpers";

// Security tests for Category Management:
//   GET    /api/admin/categories        (private: admin list with product counts)
//   POST   /api/admin/categories        (changes data: creates a category)
//   PATCH  /api/admin/categories/[id]   (changes data: renames a category)
//   DELETE /api/admin/categories/[id]   (changes data: deletes a category)

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

const list = (query = "") => listCategories(jsonRequest(`/api/admin/categories${query}`, "GET"));
const create = (body: unknown) => createCategoryRoute(jsonRequest("/api/admin/categories", "POST", body));
const rename = (id: string, body: unknown) =>
  renameCategory(jsonRequest(`/api/admin/categories/${id}`, "PATCH", body), routeParams({ id }));
const remove = (id: string) =>
  deleteCategory(jsonRequest(`/api/admin/categories/${id}`, "DELETE"), routeParams({ id }));

beforeEach(resetDatabase);

describe("GET /api/admin/categories", () => {
  it("rejects a request with no session with 401", async () => {
    expect((await list()).status).toBe(401);
  });

  it("rejects a signed-in entrepreneur with 403", async () => {
    await signInAs(await createEntrepreneur());
    expect((await list()).status).toBe(403);
  });

  it("returns categories to an admin", async () => {
    await createCategory("Crafts");
    await signInAs(await createAdmin());

    const response = await list();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.categories.map((c: { name: string }) => c.name)).toEqual(["Crafts"]);
  });

  it("rejects an invalid page size with 400", async () => {
    await signInAs(await createAdmin());
    expect((await list("?pageSize=-1")).status).toBe(400);
  });
});

describe("POST /api/admin/categories", () => {
  it("rejects a request with no session with 401 and creates nothing", async () => {
    expect((await create({ name: "Crafts" })).status).toBe(401);
    expect(await prisma.category.count()).toBe(0);
  });

  it("rejects a signed-in entrepreneur with 403 and creates nothing", async () => {
    await signInAs(await createEntrepreneur());

    expect((await create({ name: "Crafts" })).status).toBe(403);
    expect(await prisma.category.count()).toBe(0);
  });

  it("lets an admin create a category, with the slug made from the name", async () => {
    await signInAs(await createAdmin());

    const response = await create({ name: "Food & Beverages" });

    expect(response.status).toBe(201);
    const saved = await prisma.category.findFirstOrThrow();
    expect(saved.name).toBe("Food & Beverages");
    expect(saved.slug).toBe("food-beverages");
  });

  it("rejects a client-chosen slug or id with 400 instead of trusting it", async () => {
    await signInAs(await createAdmin());

    const response = await create({ name: "Crafts", slug: "../admin", id: "my-id" });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toMatch(/slug|id/);
    expect(await prisma.category.count()).toBe(0);
  });

  it("rejects a missing, empty, non-text or too-long name with 400", async () => {
    await signInAs(await createAdmin());

    for (const body of [{}, { name: "" }, { name: "   " }, { name: 42 }, { name: ["a"] }, { name: "a".repeat(61) }]) {
      expect((await create(body)).status).toBe(400);
    }
    expect(await prisma.category.count()).toBe(0);
  });

  it("rejects a name with no letters or numbers with 400", async () => {
    await signInAs(await createAdmin());

    expect((await create({ name: "<>&!!" })).status).toBe(400);
    expect(await prisma.category.count()).toBe(0);
  });

  it("rejects a duplicate name with 409", async () => {
    await createCategory("Crafts");
    await signInAs(await createAdmin());

    expect((await create({ name: "Crafts" })).status).toBe(409);
    expect(await prisma.category.count()).toBe(1);
  });

  it("rejects a malformed JSON body with 400", async () => {
    await signInAs(await createAdmin());
    const broken = new NextRequest(new URL("/api/admin/categories", "http://localhost"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{name:",
    });

    expect((await createCategoryRoute(broken)).status).toBe(400);
  });
});

describe("PATCH /api/admin/categories/[id]", () => {
  it("rejects a request with no session with 401 and changes nothing", async () => {
    const category = await createCategory("Crafts");

    expect((await rename(category.id, { name: "Hacked" })).status).toBe(401);
    expect((await prisma.category.findUniqueOrThrow({ where: { id: category.id } })).name).toBe("Crafts");
  });

  it("rejects a signed-in entrepreneur with 403 and changes nothing", async () => {
    const category = await createCategory("Crafts");
    await signInAs(await createEntrepreneur());

    expect((await rename(category.id, { name: "Hacked" })).status).toBe(403);
    expect((await prisma.category.findUniqueOrThrow({ where: { id: category.id } })).name).toBe("Crafts");
  });

  it("lets an admin rename a category, and the slug follows the name", async () => {
    const category = await createCategory("Crafts");
    await signInAs(await createAdmin());

    expect((await rename(category.id, { name: "Arts & Crafts" })).status).toBe(200);

    const saved = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(saved.name).toBe("Arts & Crafts");
    expect(saved.slug).toBe("arts-crafts");
  });

  it("rejects extra fields such as slug with 400 and changes nothing", async () => {
    const category = await createCategory("Crafts");
    await signInAs(await createAdmin());

    expect((await rename(category.id, { name: "Crafts 2", slug: "evil" })).status).toBe(400);
    expect((await prisma.category.findUniqueOrThrow({ where: { id: category.id } })).slug).toBe("crafts");
  });

  it("rejects renaming to a name another category already has with 409", async () => {
    await createCategory("Food");
    const category = await createCategory("Crafts");
    await signInAs(await createAdmin());

    expect((await rename(category.id, { name: "Food" })).status).toBe(409);
    expect((await prisma.category.findUniqueOrThrow({ where: { id: category.id } })).name).toBe("Crafts");
  });

  it("answers 404 for an unknown or malformed id", async () => {
    await signInAs(await createAdmin());
    expect((await rename("does-not-exist", { name: "X" })).status).toBe(404);
    expect((await rename("../../x", { name: "X" })).status).toBe(404);
  });
});

describe("DELETE /api/admin/categories/[id]", () => {
  it("rejects a request with no session with 401 and keeps the category", async () => {
    const category = await createCategory("Crafts");

    expect((await remove(category.id)).status).toBe(401);
    expect(await prisma.category.count()).toBe(1);
  });

  it("rejects a signed-in entrepreneur with 403 and keeps the category", async () => {
    const category = await createCategory("Crafts");
    await signInAs(await createEntrepreneur());

    expect((await remove(category.id)).status).toBe(403);
    expect(await prisma.category.count()).toBe(1);
  });

  it("lets an admin delete an unused category", async () => {
    const category = await createCategory("Crafts");
    await signInAs(await createAdmin());

    expect((await remove(category.id)).status).toBe(200);
    expect(await prisma.category.count()).toBe(0);
  });

  it("refuses to delete a category that products still use with 409", async () => {
    const seller = await createEntrepreneur();
    const product = await createProduct(businessOf(seller).id);
    await signInAs(await createAdmin());

    expect((await remove(product.categoryId)).status).toBe(409);
    expect(await prisma.category.findUnique({ where: { id: product.categoryId } })).not.toBeNull();
    expect(await prisma.product.findUnique({ where: { id: product.id } })).not.toBeNull();
  });

  it("answers 404 for an unknown or malformed id", async () => {
    await signInAs(await createAdmin());
    expect((await remove("does-not-exist")).status).toBe(404);
    expect((await remove("' OR 1=1 --")).status).toBe(404);
  });
});
