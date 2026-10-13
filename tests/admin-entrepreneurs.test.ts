import { beforeEach, describe, expect, it } from "vitest";
import { GET as listEntrepreneurs } from "@/app/api/admin/entrepreneurs/route";
import { GET as getEntrepreneur, DELETE as deleteEntrepreneur } from "@/app/api/admin/entrepreneurs/[id]/route";
import { PATCH as approveEntrepreneur } from "@/app/api/admin/entrepreneurs/[id]/approve/route";
import { PATCH as rejectEntrepreneur } from "@/app/api/admin/entrepreneurs/[id]/reject/route";
import { prisma } from "@/lib/prisma";
import {
  createAdmin,
  createEntrepreneur,
  createOrder,
  createProduct,
  jsonRequest,
  resetDatabase,
  routeParams,
  signInAs,
  signOut,
  userWithSecrets,
} from "./helpers";

// Admin entrepreneur endpoints (Entrepreneur Registration Approval,
// Entrepreneur Details and Entrepreneur Management pages).

beforeEach(resetDatabase);

const statusOf = async (profileId: string) =>
  (await prisma.entrepreneurProfile.findUniqueOrThrow({ where: { id: profileId } })).status;

describe("GET /api/admin/entrepreneurs", () => {
  it("rejects no session (401) and an entrepreneur (403)", async () => {
    expect((await listEntrepreneurs(jsonRequest("/api/admin/entrepreneurs", "GET"))).status).toBe(401);

    await signInAs(await createEntrepreneur());
    expect((await listEntrepreneurs(jsonRequest("/api/admin/entrepreneurs", "GET"))).status).toBe(403);
  });

  it("filters the approval queue by exact status", async () => {
    await createEntrepreneur("PENDING");
    await createEntrepreneur("APPROVED");
    await signInAs(await createAdmin());

    const response = await listEntrepreneurs(jsonRequest("/api/admin/entrepreneurs?status=PENDING", "GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entrepreneurs).toHaveLength(1);
    expect(body.entrepreneurs[0].status).toBe("PENDING");
  });

  it("rejects an out-of-range page size with 400", async () => {
    await signInAs(await createAdmin());
    const response = await listEntrepreneurs(jsonRequest("/api/admin/entrepreneurs?pageSize=100000", "GET"));
    expect(response.status).toBe(400);
  });
});

describe("GET /api/admin/entrepreneurs/[id]", () => {
  it("rejects no session (401) and an entrepreneur (403)", async () => {
    const target = await createEntrepreneur("PENDING");
    const id = target.entrepreneurProfile!.id;

    expect((await getEntrepreneur(jsonRequest(`/x`, "GET"), routeParams({ id }))).status).toBe(401);

    await signInAs(await createEntrepreneur());
    expect((await getEntrepreneur(jsonRequest(`/x`, "GET"), routeParams({ id }))).status).toBe(403);
  });

  it("returns the details to an admin without the password hash or reset token", async () => {
    const target = await createEntrepreneur("PENDING");
    await prisma.user.update({ where: { id: target.id }, data: { resetToken: "f".repeat(64) } });
    await signInAs(await createAdmin());

    const response = await getEntrepreneur(jsonRequest("/x", "GET"), routeParams({ id: target.entrepreneurProfile!.id }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(text).entrepreneur.user.email).toBe(target.email);
    expect(text).not.toMatch(/passwordHash|resetToken|\$2[aby]\$|f{64}/);
  });

  it("returns 404 for an unknown id", async () => {
    await signInAs(await createAdmin());
    const response = await getEntrepreneur(jsonRequest("/x", "GET"), routeParams({ id: "doesnotexist" }));
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/entrepreneurs/[id]/approve", () => {
  it("rejects no session (401) and an entrepreneur approving themselves (403), leaving status unchanged", async () => {
    const pending = await createEntrepreneur("PENDING");
    const id = pending.entrepreneurProfile!.id;

    expect((await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id }))).status).toBe(401);

    await signInAs(pending);
    expect((await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id }))).status).toBe(403);
    expect(await statusOf(id)).toBe("PENDING");
  });

  it("approves, records the reviewing admin and notifies the entrepreneur", async () => {
    const pending = await createEntrepreneur("PENDING");
    const admin = await createAdmin();
    await signInAs(admin);

    const response = await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id: pending.entrepreneurProfile!.id }));

    expect(response.status).toBe(200);
    const profile = await prisma.entrepreneurProfile.findUniqueOrThrow({ where: { id: pending.entrepreneurProfile!.id } });
    expect(profile.status).toBe("APPROVED");
    expect(profile.reviewedById).toBe(admin.id);
    expect(await prisma.notification.count({ where: { userId: pending.id } })).toBe(1);
  });

  it("returns 409 when already approved, without a second notification", async () => {
    const approved = await createEntrepreneur("APPROVED");
    await signInAs(await createAdmin());

    const response = await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id: approved.entrepreneurProfile!.id }));

    expect(response.status).toBe(409);
    expect(await prisma.notification.count({ where: { userId: approved.id } })).toBe(0);
  });

  it("returns 404 for an unknown id", async () => {
    await signInAs(await createAdmin());
    const response = await approveEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id: "doesnotexist" }));
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/admin/entrepreneurs/[id]/reject", () => {
  it("rejects with a reason, notifies, and signs the entrepreneur out everywhere", async () => {
    const target = await createEntrepreneur("APPROVED");
    const versionBefore = (await userWithSecrets(target.id)).sessionVersion;
    await signInAs(await createAdmin());

    const response = await rejectEntrepreneur(
      jsonRequest("/x", "PATCH", { rejectionReason: "Not a student" }),
      routeParams({ id: target.entrepreneurProfile!.id })
    );

    expect(response.status).toBe(200);
    const profile = await prisma.entrepreneurProfile.findUniqueOrThrow({ where: { id: target.entrepreneurProfile!.id } });
    expect(profile.status).toBe("REJECTED");
    expect(profile.rejectionReason).toBe("Not a student");
    expect((await userWithSecrets(target.id)).sessionVersion).toBe(versionBefore + 1);
    const notification = await prisma.notification.findFirstOrThrow({ where: { userId: target.id } });
    expect(notification.message).toContain("Not a student");
  });

  it("accepts an empty body (quick reject button)", async () => {
    const target = await createEntrepreneur("PENDING");
    await signInAs(await createAdmin());

    const response = await rejectEntrepreneur(jsonRequest("/x", "PATCH"), routeParams({ id: target.entrepreneurProfile!.id }));

    expect(response.status).toBe(200);
    expect(await statusOf(target.entrepreneurProfile!.id)).toBe("REJECTED");
  });

  it.each([
    ["a non-text reason", { rejectionReason: { $ne: null } }],
    ["an extra field", { rejectionReason: "x", status: "APPROVED" }],
  ])("rejects %s with 400 and leaves the status unchanged", async (_label, body) => {
    const target = await createEntrepreneur("PENDING");
    await signInAs(await createAdmin());

    const response = await rejectEntrepreneur(jsonRequest("/x", "PATCH", body), routeParams({ id: target.entrepreneurProfile!.id }));

    expect(response.status).toBe(400);
    expect(await statusOf(target.entrepreneurProfile!.id)).toBe("PENDING");
  });

  it("returns 403 to an entrepreneur and leaves the status unchanged", async () => {
    const target = await createEntrepreneur("APPROVED");
    await signInAs(await createEntrepreneur());

    const response = await rejectEntrepreneur(jsonRequest("/x", "PATCH", {}), routeParams({ id: target.entrepreneurProfile!.id }));

    expect(response.status).toBe(403);
    expect(await statusOf(target.entrepreneurProfile!.id)).toBe("APPROVED");
  });
});

describe("DELETE /api/admin/entrepreneurs/[id]", () => {
  it("rejects an entrepreneur with 403 and deletes nothing", async () => {
    const target = await createEntrepreneur("PENDING");
    await signInAs(await createEntrepreneur());

    const response = await deleteEntrepreneur(jsonRequest("/x", "DELETE"), routeParams({ id: target.entrepreneurProfile!.id }));

    expect(response.status).toBe(403);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
  });

  it("refuses (409) to delete an entrepreneur whose products were ordered", async () => {
    const target = await createEntrepreneur("APPROVED");
    const product = await createProduct(target.entrepreneurProfile!.business!.id);
    await createOrder(target.entrepreneurProfile!.business!.id, product.id);
    await signInAs(await createAdmin());

    const response = await deleteEntrepreneur(jsonRequest("/x", "DELETE"), routeParams({ id: target.entrepreneurProfile!.id }));

    expect(response.status).toBe(409);
    expect(await prisma.product.count({ where: { id: product.id } })).toBe(1);
  });

  it("deletes an entrepreneur with no sales history, including their account", async () => {
    const target = await createEntrepreneur("REJECTED");
    await createProduct(target.entrepreneurProfile!.business!.id, { status: "REJECTED" });
    await signInAs(await createAdmin());

    const response = await deleteEntrepreneur(jsonRequest("/x", "DELETE"), routeParams({ id: target.entrepreneurProfile!.id }));

    expect(response.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    expect(await prisma.product.count({ where: { businessId: target.entrepreneurProfile!.business!.id } })).toBe(0);
    signOut();
  });
});
