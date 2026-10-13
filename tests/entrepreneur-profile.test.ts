import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getProfile, PATCH as updateProfile } from "@/app/api/entrepreneurs/me/route";
import { POST as uploadLogo } from "@/app/api/entrepreneurs/me/logo/route";
import { GET as getStorefront } from "@/app/api/businesses/[businessId]/route";
import { prisma } from "@/lib/prisma";
import {
  createAdmin,
  createEntrepreneur,
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

// GET/PATCH /api/entrepreneurs/me, POST /api/entrepreneurs/me/logo and the
// public storefront GET /api/businesses/[businessId].

const profileForm = {
  businessName: "Kandy Bakes",
  description: "Home-made cakes",
  businessCategory: "Food",
  instagramHandle: "@kandybakes",
  websiteUrl: "https://kandybakes.lk",
  businessHours: "Mon-Fri 9-5",
  pickupLocationNotes: "Library entrance",
  university: "FHSS",
  whatsappNumber: "+94 71 555 1234",
  bio: "Fresh every day",
};

const patch = (body: unknown) => updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", body));
const business = (user: Awaited<ReturnType<typeof createEntrepreneur>>) => user.entrepreneurProfile!.business!;

beforeEach(async () => {
  await removeUploadedTestFiles();
  await resetDatabase();
});

afterAll(removeUploadedTestFiles);

describe("GET /api/entrepreneurs/me", () => {
  it("401 without a session", async () => {
    expect((await getProfile()).status).toBe(401);
  });

  it("403 for an admin", async () => {
    await signInAs(await createAdmin());
    expect((await getProfile()).status).toBe(403);
  });

  it("returns only the caller's own business, without secrets", async () => {
    const me = await createEntrepreneur();
    await createEntrepreneur();
    await signInAs(me);

    const body = await (await getProfile()).json();

    expect(body.business.id).toBe(business(me).id);
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|resetToken|sessionVersion/);
  });
});

describe("PATCH /api/entrepreneurs/me", () => {
  it("401 without a session, and nothing changes", async () => {
    const me = await createEntrepreneur();

    expect((await patch(profileForm)).status).toBe(401);
    expect((await prisma.business.findUnique({ where: { id: business(me).id } }))!.businessName).toBe("Test Business");
  });

  it("403 for an admin", async () => {
    await signInAs(await createAdmin());
    expect((await patch(profileForm)).status).toBe(403);
  });

  it("saves business and profile fields, and a refresh shows them", async () => {
    const me = await createEntrepreneur();
    await signInAs(me);

    expect((await patch(profileForm)).status).toBe(200);

    const saved = await prisma.business.findUnique({
      where: { id: business(me).id },
      include: { entrepreneurProfile: true },
    });
    expect(saved).toMatchObject({ businessName: "Kandy Bakes", websiteUrl: "https://kandybakes.lk" });
    expect(saved!.entrepreneurProfile).toMatchObject({ university: "FHSS", whatsappNumber: "+94 71 555 1234" });
    expect((await (await getProfile()).json()).business.businessName).toBe("Kandy Bakes");
  });

  it("a pending entrepreneur may edit their profile while waiting for approval", async () => {
    const me = await createEntrepreneur("PENDING");
    await signInAs(me);
    expect((await patch({ businessName: "Waiting Shop" })).status).toBe(200);
  });

  it("only ever changes the caller's business", async () => {
    const me = await createEntrepreneur();
    const other = await createEntrepreneur();
    await signInAs(me);

    await patch(profileForm);

    expect((await prisma.business.findUnique({ where: { id: business(other).id } }))!.businessName).toBe("Test Business");
  });

  it.each([
    ["status", { status: "APPROVED" }],
    ["userId", { userId: "someone-else" }],
    ["logoUrl", { logoUrl: "https://evil.example/x.png" }],
  ])("rejects the unexpected field %s with 400 and changes nothing", async (field, extra) => {
    const me = await createEntrepreneur("PENDING");
    await signInAs(me);

    const response = await patch({ ...profileForm, ...extra });

    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain(field);
    const saved = await prisma.entrepreneurProfile.findUnique({ where: { id: me.entrepreneurProfile!.id } });
    expect(saved!.status).toBe("PENDING");
    expect((await prisma.business.findUnique({ where: { id: business(me).id } }))!.businessName).toBe("Test Business");
  });

  it.each([
    ["an empty business name", { businessName: "" }],
    ["an invalid WhatsApp number", { whatsappNumber: "call me" }],
    ["a javascript: website", { websiteUrl: "javascript:alert(1)" }],
    ["a name that is too long", { businessName: "x".repeat(101) }],
  ])("rejects %s with 400", async (_label, change) => {
    const me = await createEntrepreneur();
    await signInAs(me);
    expect((await patch({ ...profileForm, ...change })).status).toBe(400);
  });
});

describe("POST /api/entrepreneurs/me/logo", () => {
  function logoUpload(file?: File) {
    const form = new FormData();
    if (file) form.append("logo", file);
    return uploadLogo(formRequest("/api/entrepreneurs/me/logo", "POST", form));
  }

  it("401 without a session", async () => {
    expect((await logoUpload(tinyPngFile())).status).toBe(401);
  });

  it("403 for an admin", async () => {
    await signInAs(await createAdmin());
    expect((await logoUpload(tinyPngFile())).status).toBe(403);
  });

  it("saves a real image and stores its url on the caller's business", async () => {
    const me = await createEntrepreneur();
    await signInAs(me);

    expect((await logoUpload(tinyPngFile())).status).toBe(200);

    const saved = await prisma.business.findUnique({ where: { id: business(me).id } });
    expect(saved!.logoUrl).toMatch(/^\/uploads\/logos\/.+\.png$/);
    expect(uploadedFileExists(saved!.logoUrl!)).toBe(true);
  });

  it("rejects a file that only pretends to be an image, and a missing file, with 400", async () => {
    const me = await createEntrepreneur();
    await signInAs(me);

    expect((await logoUpload(fakePngFile())).status).toBe(400);
    expect((await logoUpload()).status).toBe(400);
    expect((await prisma.business.findUnique({ where: { id: business(me).id } }))!.logoUrl).toBeNull();
  });
});

describe("GET /api/businesses/[businessId] (public storefront)", () => {
  const storefront = (businessId: string) =>
    getStorefront(jsonRequest(`/api/businesses/${businessId}`, "GET"), routeParams({ businessId }));

  it("shows an approved seller's shop without private account data", async () => {
    const seller = await createEntrepreneur();

    const response = await storefront(business(seller).id);

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain(seller.email);
    expect(text).not.toContain("passwordHash");
  });

  it.each(["PENDING", "REJECTED"] as const)("hides a %s seller's shop with 404", async (status) => {
    const seller = await createEntrepreneur(status);
    expect((await storefront(business(seller).id)).status).toBe(404);
  });
});
