import { beforeEach, describe, expect, it } from "vitest";
import { GET as getRankings } from "@/app/api/admin/rankings/route";
import {
  createAdmin,
  createEntrepreneur,
  createOrder,
  createProduct,
  jsonRequest,
  resetDatabase,
  signInAs,
} from "./helpers";

// Security tests for Entrepreneur Rankings:
//   GET /api/admin/rankings  (private: revenue per business)

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

async function sellerWithSale(status: "PENDING" | "PENDING_VERIFICATION" | "VERIFIED") {
  const seller = await createEntrepreneur();
  const product = await createProduct(businessOf(seller).id);
  await createOrder(businessOf(seller).id, product.id, status);
  return seller;
}

const rankings = (query = "") => getRankings(jsonRequest(`/api/admin/rankings${query}`, "GET"));

beforeEach(resetDatabase);

describe("GET /api/admin/rankings", () => {
  it("rejects a request with no session with 401", async () => {
    await sellerWithSale("VERIFIED");
    expect((await rankings()).status).toBe(401);
  });

  it("rejects a signed-in entrepreneur with 403, even one who is ranked", async () => {
    const seller = await sellerWithSale("VERIFIED");
    await signInAs(seller);

    expect((await rankings()).status).toBe(403);
  });

  it("rejects a pending entrepreneur with 403", async () => {
    await signInAs(await createEntrepreneur("PENDING"));
    expect((await rankings()).status).toBe(403);
  });

  it("ranks only verified sales for an admin", async () => {
    const verified = await sellerWithSale("VERIFIED");
    await sellerWithSale("PENDING_VERIFICATION");
    await sellerWithSale("PENDING");
    await signInAs(await createAdmin());

    const response = await rankings("?period=all");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.podium).toHaveLength(1);
    expect(body.podium[0].businessId).toBe(businessOf(verified).id);
    expect(body.podium[0].revenue).toBe(500);
  });

  it("does not expose entrepreneurs' emails or contact numbers", async () => {
    const seller = await sellerWithSale("VERIFIED");
    await signInAs(await createAdmin());

    const raw = JSON.stringify(await (await rankings("?period=all")).json());

    expect(raw).not.toContain(seller.email);
    expect(raw).not.toContain("0771234567");
    expect(raw).not.toContain("passwordHash");
  });

  it("rejects an unknown period with 400", async () => {
    await signInAs(await createAdmin());
    expect((await rankings("?period=forever")).status).toBe(400);
  });

  it("rejects invalid paging with 400", async () => {
    await signInAs(await createAdmin());
    expect((await rankings("?page=0")).status).toBe(400);
    expect((await rankings("?pageSize=100000")).status).toBe(400);
    expect((await rankings("?page=abc")).status).toBe(400);
  });
});
