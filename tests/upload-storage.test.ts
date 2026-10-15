import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { del, put } from "@vercel/blob";
import { deleteUploadedFile, MAX_UPLOAD_BYTES, saveUploadedFile, UploadValidationError } from "@/lib/upload";
import { fakePngFile, tinyPngFile } from "./helpers";

// On Vercel (BLOB_READ_WRITE_TOKEN set), uploads go to Vercel Blob instead of
// the disk. The Blob SDK is replaced here, so no real store is contacted.

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string) => ({ url: `https://abc123.public.blob.vercel-storage.com/${pathname}` })),
  del: vi.fn(async () => undefined),
}));

const STORE = "https://abc123.public.blob.vercel-storage.com";

beforeEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  vi.mocked(put).mockClear();
  vi.mocked(del).mockClear();
});

afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL;
});

describe("saveUploadedFile with Vercel Blob", () => {
  it("stores a real image under a random name, typed from its content, and returns the Blob URL", async () => {
    const url = await saveUploadedFile(tinyPngFile("../../evil.html"), "products");

    expect(url).toMatch(/^https:\/\/abc123\.public\.blob\.vercel-storage\.com\/uploads\/products\/[0-9a-f-]{36}\.png$/);
    const [pathname, , options] = vi.mocked(put).mock.calls[0];
    expect(pathname).toMatch(/^uploads\/products\/[0-9a-f-]{36}\.png$/);
    expect(options).toMatchObject({ access: "public", contentType: "image/png", addRandomSuffix: false });
  });

  it("rejects a disguised file and an oversized file before anything is stored", async () => {
    await expect(saveUploadedFile(fakePngFile(), "products")).rejects.toBeInstanceOf(UploadValidationError);

    const big = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.png", { type: "image/png" });
    await expect(saveUploadedFile(big, "products")).rejects.toBeInstanceOf(UploadValidationError);

    expect(put).not.toHaveBeenCalled();
  });

  it("also uses Blob for newer stores connected by store id (no read-write token)", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = "store_abc123";

    const url = await saveUploadedFile(tinyPngFile(), "logos");

    expect(url).toMatch(/^https:\/\/abc123\.public\.blob\.vercel-storage\.com\/uploads\/logos\//);
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("on Vercel without a Blob store, fails with a clear message instead of writing to disk", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.VERCEL = "1";

    await expect(saveUploadedFile(tinyPngFile(), "logos")).rejects.toThrow(/Vercel Blob store/);
    expect(put).not.toHaveBeenCalled();
  });

  it("keeps the 4 MB limit under Vercel's 4.5 MB request limit", () => {
    expect(MAX_UPLOAD_BYTES).toBeLessThanOrEqual(4 * 1024 * 1024);
  });
});

describe("deleteUploadedFile", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";

  it("deletes a product image from our Blob store", async () => {
    await deleteUploadedFile(`${STORE}/uploads/products/${uuid}.png`, "products");
    expect(del).toHaveBeenCalledWith(`${STORE}/uploads/products/${uuid}.png`);
  });

  it.each([
    ["another site", `https://evil.example.com/uploads/products/${uuid}.png`],
    ["another folder", `${STORE}/uploads/sales-confirmations/${uuid}.png`],
    ["a non-upload path", `${STORE}/something/else.png`],
    ["a look-alike domain", `https://abc123.public.blob.vercel-storage.com.evil.com/uploads/products/${uuid}.png`],
  ])("ignores %s", async (_label, url) => {
    await deleteUploadedFile(url, "products");
    expect(del).not.toHaveBeenCalled();
  });
});
