import { beforeEach, describe, expect, it } from "vitest";
import { GET as listReviews } from "@/app/api/admin/reviews/route";
import { DELETE as deleteReview } from "@/app/api/admin/reviews/[id]/route";
import { prisma } from "@/lib/prisma";
import {
  createAdmin,
  createEntrepreneur,
  createProduct,
  jsonRequest,
  resetDatabase,
  routeParams,
  signInAs,
} from "./helpers";

// Security tests for Content Management (review moderation):
//   GET    /api/admin/reviews        (private: every review on the platform)
//   DELETE /api/admin/reviews/[id]   (changes data: removes a review)

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

// A product with two reviews (5 and 1 stars) and its rating summary stored.
async function reviewedProduct() {
  const seller = await createEntrepreneur();
  const product = await createProduct(businessOf(seller).id);
  const good = await prisma.review.create({
    data: { productId: product.id, reviewerName: "Asha", rating: 5, comment: "Lovely" },
  });
  const bad = await prisma.review.create({
    data: { productId: product.id, reviewerName: "Troll", rating: 1, comment: "Spam" },
  });
  await prisma.product.update({ where: { id: product.id }, data: { ratingAverage: 3, ratingCount: 2 } });
  return { seller, product, good, bad };
}

const list = (query = "") => listReviews(jsonRequest(`/api/admin/reviews${query}`, "GET"));
const remove = (id: string) => deleteReview(jsonRequest(`/api/admin/reviews/${id}`, "DELETE"), routeParams({ id }));

beforeEach(resetDatabase);

describe("GET /api/admin/reviews", () => {
  it("rejects a request with no session with 401", async () => {
    await reviewedProduct();
    expect((await list()).status).toBe(401);
  });

  it("rejects a signed-in entrepreneur with 403", async () => {
    const { seller } = await reviewedProduct();
    await signInAs(seller);

    expect((await list()).status).toBe(403);
  });

  it("returns every review to an admin", async () => {
    await reviewedProduct();
    await signInAs(await createAdmin());

    const response = await list();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews).toHaveLength(2);
  });

  it("rejects invalid paging with 400", async () => {
    await signInAs(await createAdmin());
    expect((await list("?page=-1")).status).toBe(400);
    expect((await list("?pageSize=1000")).status).toBe(400);
  });
});

describe("DELETE /api/admin/reviews/[id]", () => {
  it("rejects a request with no session with 401 and keeps the review", async () => {
    const { bad } = await reviewedProduct();

    expect((await remove(bad.id)).status).toBe(401);
    expect(await prisma.review.findUnique({ where: { id: bad.id } })).not.toBeNull();
  });

  it("does not let the seller delete a bad review of their own product (403)", async () => {
    const { seller, product, bad } = await reviewedProduct();
    await signInAs(seller);

    expect((await remove(bad.id)).status).toBe(403);
    expect(await prisma.review.findUnique({ where: { id: bad.id } })).not.toBeNull();
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).ratingCount).toBe(2);
  });

  it("lets an admin remove a review and recalculates the product's rating", async () => {
    const { product, good, bad } = await reviewedProduct();
    await signInAs(await createAdmin());

    expect((await remove(bad.id)).status).toBe(200);

    expect(await prisma.review.findUnique({ where: { id: bad.id } })).toBeNull();
    expect(await prisma.review.findUnique({ where: { id: good.id } })).not.toBeNull();
    const saved = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(saved.ratingCount).toBe(1);
    expect(saved.ratingAverage).toBe(5);
  });

  it("answers 404 when the same review is removed twice", async () => {
    const { bad } = await reviewedProduct();
    await signInAs(await createAdmin());

    expect((await remove(bad.id)).status).toBe(200);
    expect((await remove(bad.id)).status).toBe(404);
  });

  it("answers 404 for an unknown or malformed id and deletes nothing", async () => {
    await reviewedProduct();
    await signInAs(await createAdmin());

    expect((await remove("does-not-exist")).status).toBe(404);
    expect((await remove("' OR 1=1 --")).status).toBe(404);
    expect(await prisma.review.count()).toBe(2);
  });
});
