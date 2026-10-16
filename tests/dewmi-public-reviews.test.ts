import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/reviews/route";
import { GET } from "@/app/api/reviews/product/[productId]/route";
import { prisma } from "@/lib/prisma";
import { createEntrepreneur, createProduct, jsonRequest, resetDatabase, routeParams } from "./helpers";

beforeEach(resetDatabase);

async function productForReview(status: "APPROVED" | "PENDING" = "APPROVED") {
  const seller = await createEntrepreneur();
  return createProduct(seller.entrepreneurProfile!.business!.id, { status });
}
const submit = (productId: string, extra: Record<string, unknown> = {}) => POST(jsonRequest("/api/reviews", "POST", {
  productId, reviewerName: "Campus Buyer", rating: 4, comment: "Good quality", ...extra,
}));

describe("Dewmi public reviews", () => {
  it("saves a guest review and returns the persisted rating summary", async () => {
    const product = await productForReview();
    expect((await submit(product.id)).status).toBe(201);
    expect(await prisma.review.count({ where: { productId: product.id } })).toBe(1);
    const response = await GET(jsonRequest(`/api/reviews/product/${product.id}`, "GET"), routeParams({ productId: product.id }));
    const body = await response.json();
    expect(body.summary).toMatchObject({ totalReviews: 1, averageRating: 4 });
    expect(body.reviews[0].comment).toBe("Good quality");
  });

  it("rejects injected fields and leaves the database unchanged", async () => {
    const product = await productForReview();
    expect((await submit(product.id, { role: "ADMIN" })).status).toBe(400);
    expect(await prisma.review.count()).toBe(0);
  });

  it.each([0, 6, 1.5])("rejects invalid rating %s without saving", async (rating) => {
    const product = await productForReview();
    expect((await submit(product.id, { rating })).status).toBe(400);
    expect(await prisma.review.count()).toBe(0);
  });

  it("blocks reviews and private details for an unpublished product", async () => {
    const product = await productForReview("PENDING");
    expect((await submit(product.id)).status).toBe(404);
    expect((await GET(jsonRequest(`/api/reviews/product/${product.id}`, "GET"), routeParams({ productId: product.id }))).status).toBe(404);
    expect(await prisma.review.count()).toBe(0);
  });
});
