import { beforeEach, describe, expect, it } from "vitest";
import { GET as getReports } from "@/app/api/admin/reports/route";
import { GET as getMonthlySalesAudit } from "@/app/api/admin/reports/monthly-sales-audit/route";
import { GET as getEntrepreneurDirectory } from "@/app/api/admin/reports/entrepreneur-directory/route";
import {
  createAdmin,
  createEntrepreneur,
  createOrder,
  createProduct,
  jsonRequest,
  resetDatabase,
  signInAs,
} from "./helpers";

// Security tests for Reports & Analytics:
//   GET /api/admin/reports                          (private: platform-wide revenue)
//   GET /api/admin/reports/monthly-sales-audit      (private: PDF download)
//   GET /api/admin/reports/entrepreneur-directory   (private: PDF download)

const businessOf = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

async function sellerWithSale(status: "PENDING" | "PENDING_VERIFICATION" | "VERIFIED") {
  const seller = await createEntrepreneur();
  const product = await createProduct(businessOf(seller).id);
  await createOrder(businessOf(seller).id, product.id, status);
  return seller;
}

const pdfReports = [
  {
    name: "monthly-sales-audit",
    get: () => getMonthlySalesAudit(jsonRequest("/api/admin/reports/monthly-sales-audit", "GET")),
  },
  {
    name: "entrepreneur-directory",
    get: () => getEntrepreneurDirectory(jsonRequest("/api/admin/reports/entrepreneur-directory", "GET")),
  },
];

beforeEach(resetDatabase);

describe("GET /api/admin/reports", () => {
  it("rejects a request with no session with 401", async () => {
    await sellerWithSale("VERIFIED");
    expect((await getReports()).status).toBe(401);
  });

  it("rejects a signed-in entrepreneur with 403 and reveals no figures", async () => {
    const seller = await sellerWithSale("VERIFIED");
    await signInAs(seller);

    const response = await getReports();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).not.toHaveProperty("totalRevenue");
  });

  it("returns figures to an admin, counting only verified sales as revenue", async () => {
    await sellerWithSale("VERIFIED");
    await sellerWithSale("PENDING_VERIFICATION");
    await signInAs(await createAdmin());

    const response = await getReports();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.totalRevenue).toBe(500);
    expect(body.totalOrders).toBe(2);
  });

  it("does not expose any user's email or buyer details", async () => {
    const seller = await sellerWithSale("VERIFIED");
    await signInAs(await createAdmin());

    const raw = JSON.stringify(await (await getReports()).json());

    expect(raw).not.toContain(seller.email);
    expect(raw).not.toContain("Test Buyer");
    expect(raw).not.toContain("0771234567");
  });
});

describe.each(pdfReports)("GET /api/admin/reports/$name", ({ get }) => {
  it("rejects a request with no session with 401 and no PDF", async () => {
    await sellerWithSale("VERIFIED");

    const response = await get();

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).not.toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toBeNull();
  });

  it("rejects a signed-in entrepreneur with 403 and no PDF", async () => {
    await signInAs(await sellerWithSale("VERIFIED"));

    const response = await get();

    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).not.toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toBeNull();
  });

  it("gives an admin a PDF download", async () => {
    await sellerWithSale("VERIFIED");
    await signInAs(await createAdmin());

    const response = await get();
    const bytes = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="[a-z-]+-\d{4}-\d{2}-\d{2}\.pdf"$/);
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
