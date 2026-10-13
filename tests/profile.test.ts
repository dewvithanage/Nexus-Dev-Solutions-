import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { GET as getProfile, PATCH as updateProfile } from "@/app/api/entrepreneurs/me/route";
import { POST as uploadLogo } from "@/app/api/entrepreneurs/me/logo/route";
import { GET as getStorefront } from "@/app/api/businesses/[businessId]/route";
import {
  createAdmin,
  createEntrepreneur,
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

const profileForm = {
  businessName: "Kandy Bakes",
  description: "Home-made cakes",
  businessCategory: "Food",
  instagramHandle: "@kandybakes",
  websiteUrl: "kandybakes.lk",
  businessHours: "Mon-Fri 9-5",
  pickupLocationNotes: "Library entrance",
  university: "FHSS",
  whatsappNumber: "+94 71 555 1234",
  bio: "Fresh every day",
};

beforeEach(async () => {
  await removeUploadedTestFiles();
  await resetDatabase();
  signOut();
});

afterAll(async () => {
  await removeUploadedTestFiles();
  await prisma.$disconnect();
});

describe("GET /api/entrepreneurs/me", () => {
  it("401 without a session", async () => {
    expect((await getProfile()).status).toBe(401);
  });

  it("403 for a signed-in admin", async () => {
    await signInAs(await createAdmin());
    expect((await getProfile()).status).toBe(403);
  });

  it("401 when the session belongs to an account that no longer exists", async () => {
    const { user } = await createEntrepreneur();
    await signInAs(user);
    await prisma.business.deleteMany();
    await prisma.entrepreneurProfile.deleteMany();
    await prisma.user.delete({ where: { id: user.id } });
    expect((await getProfile()).status).toBe(401);
  });

  it("returns the caller's own profile and business only", async () => {
    const mine = await createEntrepreneur();
    await createEntrepreneur();
    await signInAs(mine.user);

    const body = await (await getProfile()).json();
    expect(body.business.id).toBe(mine.business.id);
    expect(body.entrepreneurProfile.id).toBe(mine.profile.id);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });
});

describe("PATCH /api/entrepreneurs/me", () => {
  it("401 without a session, and nothing changes", async () => {
    const { business } = await createEntrepreneur();
    const response = await updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", profileForm));
    expect(response.status).toBe(401);
    expect((await prisma.business.findUnique({ where: { id: business.id } }))!.businessName).toBe(business.businessName);
  });

  it("403 for a signed-in admin", async () => {
    await signInAs(await createAdmin());
    const response = await updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", profileForm));
    expect(response.status).toBe(403);
  });

  it("saves both the business and the entrepreneur profile fields to the database", async () => {
    const { user, business, profile } = await createEntrepreneur();
    await signInAs(user);

    const response = await updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", profileForm));
    expect(response.status).toBe(200);

    const savedBusiness = await prisma.business.findUnique({ where: { id: business.id } });
    const savedProfile = await prisma.entrepreneurProfile.findUnique({ where: { id: profile.id } });
    expect(savedBusiness).toMatchObject({
      businessName: "Kandy Bakes",
      description: "Home-made cakes",
      instagramHandle: "@kandybakes",
      // A website without a scheme is stored as https://
      websiteUrl: "https://kandybakes.lk",
      pickupLocationNotes: "Library entrance",
    });
    expect(savedProfile).toMatchObject({ university: "FHSS", whatsappNumber: "+94 71 555 1234", bio: "Fresh every day" });
  });

  it("changes only the caller's business, never another entrepreneur's", async () => {
    const mine = await createEntrepreneur();
    const other = await createEntrepreneur({ businessName: "Other Shop" });
    await signInAs(mine.user);

    await updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", profileForm));

    const otherBusiness = await prisma.business.findUnique({ where: { id: other.business.id } });
    expect(otherBusiness!.businessName).toBe("Other Shop");
  });

  it("clears an optional field when it is sent blank", async () => {
    const { user, business } = await createEntrepreneur();
    await signInAs(user);
    await updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", profileForm));

    await updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", { ...profileForm, description: "  " }));
    expect((await prisma.business.findUnique({ where: { id: business.id } }))!.description).toBeNull();
  });

  it.each([
    ["status", { status: "APPROVED" }],
    ["userId", { userId: "someone-else" }],
    ["logoUrl", { logoUrl: "https://evil.example/x.png" }],
    ["reviewedById", { reviewedById: "admin-id" }],
  ])("rejects the unexpected field %s with 400 and changes nothing", async (field, extra) => {
    const { user, profile, business } = await createEntrepreneur({ status: "PENDING" });
    await signInAs(user);

    const response = await updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", { ...profileForm, ...extra }));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toContain(field);

    const savedProfile = await prisma.entrepreneurProfile.findUnique({ where: { id: profile.id } });
    const savedBusiness = await prisma.business.findUnique({ where: { id: business.id } });
    expect(savedProfile!.status).toBe("PENDING");
    expect(savedBusiness!.businessName).toBe(business.businessName);
  });

  it.each([
    ["an empty business name", { businessName: "" }],
    ["an invalid WhatsApp number", { whatsappNumber: "not a phone" }],
    ["a javascript: website", { websiteUrl: "javascript:alert(1)" }],
    ["a name that is too long", { businessName: "x".repeat(101) }],
    ["a non-text value", { bio: 12345 }],
  ])("rejects %s with 400", async (_label, change) => {
    const { user } = await createEntrepreneur();
    await signInAs(user);
    const response = await updateProfile(jsonRequest("/api/entrepreneurs/me", "PATCH", { ...profileForm, ...change }));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/entrepreneurs/me/logo", () => {
  function logoForm(file: File) {
    const form = new FormData();
    form.append("logo", file);
    return formRequest("/api/entrepreneurs/me/logo", form);
  }

  it("401 without a session", async () => {
    expect((await uploadLogo(logoForm(pngFile()))).status).toBe(401);
  });

  it("403 for a signed-in admin", async () => {
    await signInAs(await createAdmin());
    expect((await uploadLogo(logoForm(pngFile()))).status).toBe(403);
  });

  it("saves a real image and stores its url on the caller's business", async () => {
    const { user, business } = await createEntrepreneur();
    await signInAs(user);

    const response = await uploadLogo(logoForm(pngFile()));
    expect(response.status).toBe(200);

    const saved = await prisma.business.findUnique({ where: { id: business.id } });
    expect(saved!.logoUrl).toMatch(/^\/uploads\/logos\/[0-9a-f-]{36}\.png$/);
    expect(uploadedFileExists(saved!.logoUrl!)).toBe(true);
  });

  it("rejects a file that only pretends to be an image with 400", async () => {
    const { user, business } = await createEntrepreneur();
    await signInAs(user);

    const response = await uploadLogo(logoForm(fakePngFile()));
    expect(response.status).toBe(400);
    expect((await prisma.business.findUnique({ where: { id: business.id } }))!.logoUrl).toBeNull();
  });

  it("400 when no file is attached", async () => {
    const { user } = await createEntrepreneur();
    await signInAs(user);
    expect((await uploadLogo(formRequest("/api/entrepreneurs/me/logo", new FormData()))).status).toBe(400);
  });
});

describe("GET /api/businesses/[businessId] (public storefront)", () => {
  it("shows an approved entrepreneur's shop without private account data", async () => {
    const { business, user } = await createEntrepreneur({ status: "APPROVED" });
    const response = await getStorefront(getRequest(`/api/businesses/${business.id}`), params({ businessId: business.id }));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain(user.email);
    expect(text).not.toContain("passwordHash");
  });

  it.each(["PENDING", "REJECTED"] as const)("hides a %s entrepreneur's shop (404)", async (status) => {
    const { business } = await createEntrepreneur({ status });
    const response = await getStorefront(getRequest(`/api/businesses/${business.id}`), params({ businessId: business.id }));
    expect(response.status).toBe(404);
  });
});
