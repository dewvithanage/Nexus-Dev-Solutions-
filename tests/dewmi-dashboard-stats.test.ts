import { beforeEach, describe, expect, it } from "vitest";
import { GET as statsRoute } from "@/app/api/entrepreneurs/dashboard-stats/route";
import { createAdmin, createEntrepreneur, createOrder, createProduct, resetDatabase, signInAs, jsonRequest } from "./helpers";

const GET = (request = jsonRequest("/api/entrepreneurs/dashboard-stats", "GET")) => statsRoute(request);

beforeEach(resetDatabase);
describe("GET /api/entrepreneurs/dashboard-stats", () => {
  it("rejects requests without a session", async () => {
    expect((await GET()).status).toBe(401);
  });
  it("rejects an admin or pending seller", async () => {
    await signInAs(await createAdmin());
    expect((await GET()).status).toBe(403);
    await signInAs(await createEntrepreneur("PENDING"));
    expect((await GET()).status).toBe(403);
  });
  it("rejects injected business IDs instead of exposing another seller's figures", async () => {
    const seller = await createEntrepreneur();
    const other = await createEntrepreneur();
    await signInAs(seller);
    const businessId = other.entrepreneurProfile!.business!.id;
    const response = await GET(jsonRequest(`/api/entrepreneurs/dashboard-stats?businessId=${businessId}`, "GET"));
    expect(response.status).toBe(400);
    expect(await response.json()).not.toHaveProperty("totalRevenue");
  });

  it("returns only the signed-in seller's database statistics", async () => {
    const seller = await createEntrepreneur();
    const other = await createEntrepreneur();
    const businessId = seller.entrepreneurProfile!.business!.id;
    const otherId = other.entrepreneurProfile!.business!.id;
    const product = await createProduct(businessId);
    await createProduct(businessId, { status: "PENDING" });
    await createOrder(businessId, product.id, "VERIFIED");
    await createOrder(businessId, product.id, "PENDING");
    const otherProduct = await createProduct(otherId);
    await createOrder(otherId, otherProduct.id, "VERIFIED");
    await signInAs(seller);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      activeProducts: 1, pendingProducts: 1, productsAddedThisWeek: 2,
      completedSales: 1, salesThisWeek: 1, salesLastWeek: 0,
      totalRevenue: 500, weekRevenue: 500, salesChange: null,
    });
  });
});
