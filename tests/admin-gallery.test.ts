import { existsSync, rmSync } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/admin/gallery/route";
import { prisma } from "@/lib/prisma";
import {
  createAdmin,
  createEntrepreneur,
  formRequest,
  jsonRequest,
  resetDatabase,
  signInAs,
  tinyPngFile,
} from "./helpers";

// Security tests for the admin gallery endpoints:
//   GET  /api/admin/gallery  (private: admin-only list)
//   POST /api/admin/gallery  (changes data: uploads an image)

const uploadedFiles: string[] = [];

function uploadForm(fields: Record<string, string | File> = {}) {
  const form = new FormData();
  form.append("image", tinyPngFile());
  form.append("caption", "Market day");
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return formRequest("/api/admin/gallery", "POST", form);
}

beforeEach(resetDatabase);

afterEach(() => {
  for (const url of uploadedFiles.splice(0)) {
    rmSync(path.join(process.cwd(), "public", url), { force: true });
  }
});

describe("POST /api/admin/gallery", () => {
  it("rejects a request with no session with 401 and saves nothing", async () => {
    const response = await POST(uploadForm());

    expect(response.status).toBe(401);
    expect(await prisma.galleryItem.count()).toBe(0);
  });

  it("rejects a signed-in entrepreneur with 403 and saves nothing", async () => {
    await signInAs(await createEntrepreneur());

    const response = await POST(uploadForm());

    expect(response.status).toBe(403);
    expect(await prisma.galleryItem.count()).toBe(0);
  });

  it("lets an admin upload, and saves the item with that admin as uploader", async () => {
    const admin = await createAdmin();
    await signInAs(admin);

    const response = await POST(uploadForm());
    const body = await response.json();
    uploadedFiles.push(body.item.imageUrl);

    expect(response.status).toBe(201);
    const saved = await prisma.galleryItem.findUniqueOrThrow({ where: { id: body.item.id } });
    expect(saved.caption).toBe("Market day");
    expect(saved.uploadedById).toBe(admin.id);
    expect(saved.imageUrl).toMatch(/^\/uploads\/gallery\/[0-9a-f-]{36}\.png$/);
    expect(existsSync(path.join(process.cwd(), "public", saved.imageUrl))).toBe(true);
  });

  it("rejects an extra uploadedById field instead of trusting it", async () => {
    const admin = await createAdmin();
    const otherAdmin = await createAdmin();
    await signInAs(admin);

    const response = await POST(uploadForm({ uploadedById: otherAdmin.id }));

    expect(response.status).toBe(400);
    expect((await response.json()).message).toMatch(/uploadedById/);
    expect(await prisma.galleryItem.count()).toBe(0);
  });

  it("rejects a file that is not really an image with 400", async () => {
    await signInAs(await createAdmin());
    const fake = new File(["<script>alert(1)</script>"], "evil.png", { type: "image/png" });

    const response = await POST(uploadForm({ image: fake }));

    expect(response.status).toBe(400);
    expect(await prisma.galleryItem.count()).toBe(0);
  });

  it("rejects a request without an image with 400", async () => {
    await signInAs(await createAdmin());
    const form = new FormData();
    form.append("caption", "No image");

    const response = await POST(formRequest("/api/admin/gallery", "POST", form));

    expect(response.status).toBe(400);
    expect(await prisma.galleryItem.count()).toBe(0);
  });
});

describe("GET /api/admin/gallery", () => {
  async function seedItem() {
    const admin = await createAdmin();
    await prisma.galleryItem.create({
      data: { imageUrl: "/uploads/gallery/x.png", caption: "Seeded", uploadedById: admin.id },
    });
    return admin;
  }

  it("rejects a request with no session with 401", async () => {
    await seedItem();
    const response = await GET(jsonRequest("/api/admin/gallery", "GET"));
    expect(response.status).toBe(401);
  });

  it("rejects a signed-in entrepreneur with 403", async () => {
    await seedItem();
    await signInAs(await createEntrepreneur());

    const response = await GET(jsonRequest("/api/admin/gallery", "GET"));

    expect(response.status).toBe(403);
  });

  it("returns the gallery to an admin", async () => {
    const admin = await seedItem();
    await signInAs(admin);

    const response = await GET(jsonRequest("/api/admin/gallery", "GET"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].caption).toBe("Seeded");
  });

  it("rejects an invalid page size with 400", async () => {
    await signInAs(await seedItem());

    const response = await GET(jsonRequest("/api/admin/gallery?pageSize=-5", "GET"));

    expect(response.status).toBe(400);
  });
});
