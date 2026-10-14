import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Every upload in the app (gallery images, business logos, product images,
// payment proofs) goes through this file, so the safety checks live here
// once instead of being repeated in each route.
//
// What is checked, and why:
// - SIZE: capped, so one huge file can't fill the disk or memory.
// - REAL CONTENT: the file's first bytes must be a genuine JPEG, PNG or WebP.
//   The browser-supplied type and filename are NOT trusted: a text or HTML
//   file renamed to "photo.png" is rejected.
// - EXTENSION: chosen from the detected content, never from the uploaded
//   filename. Files are served from /public, so a ".html" or ".svg" upload
//   would otherwise run as a page on the site (stored XSS).
// - NAME: a random UUID, so uploads can't overwrite each other or guess paths.
//
// WHERE files are stored:
// - On Vercel (BLOB_READ_WRITE_TOKEN is set): in Vercel Blob storage. Vercel
//   doesn't keep files written while the site runs, so the disk can't be used.
//   The URL returned is the file's https://...blob.vercel-storage.com address.
// - Everywhere else (local development, tests): under public/uploads, served
//   by Next.js at /uploads/....

// 4 MB: Vercel refuses request bodies over 4.5 MB, so a larger file could
// never arrive. Multi-image forms send one file per request for the same reason.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const CONTENT_TYPES = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" } as const;

// Our Blob store's files live on <store-id>.public.blob.vercel-storage.com.
const BLOB_HOST = /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/i;

function usesBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

type ImageExtension = ".jpg" | ".png" | ".webp";

// Look at the actual first bytes ("magic numbers") of the file.
function detectImageExtension(buffer: Buffer): ImageExtension | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return ".jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return ".png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }
  return null;
}

// Throws UploadValidationError with a user-friendly message if the file is
// not acceptable; otherwise returns its bytes and the safe extension.
async function readAndValidateImage(file: File): Promise<{ buffer: Buffer; extension: ImageExtension }> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new UploadValidationError("No file was uploaded.");
  }
  if (file.size === 0) {
    throw new UploadValidationError("The uploaded file is empty.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError("The file is too large. The maximum size is 4 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const extension = detectImageExtension(buffer);
  if (!extension) {
    throw new UploadValidationError("Only JPG, PNG or WebP images are allowed.");
  }

  return { buffer, extension };
}

// Saves an uploaded image (to Vercel Blob or /public/uploads/<subfolder>/, see
// above) and returns its public URL. "subfolder" is always a fixed word chosen by our own code
// (e.g. "gallery"), but it is checked anyway so a future caller can never
// use it to write outside the uploads folder.
export async function saveUploadedFile(file: File, subfolder: string): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(subfolder)) {
    throw new Error("Invalid upload folder.");
  }

  const { buffer, extension } = await readAndValidateImage(file);
  const filename = `${crypto.randomUUID()}${extension}`;

  if (usesBlobStorage()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${subfolder}/${filename}`, buffer, {
      access: "public",
      // Set from the detected content, so the file is always served as an image.
      contentType: CONTENT_TYPES[extension],
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadsDir, { recursive: true });

  await writeFile(path.join(uploadsDir, filename), buffer);

  return `/uploads/${subfolder}/${filename}`;
}

// Older name kept so any file still importing it keeps working. Same
// validation and the same random filename as saveUploadedFile.
export async function saveFile(file: File, subfolder: string = "general"): Promise<string> {
  return saveUploadedFile(file, subfolder);
}

// Best-effort removal of a file saved by saveUploadedFile (e.g. when a product
// image is removed). Only files this module could have created are touched:
// a URL in our Blob store, or /uploads/<subfolder>/<uuid>.<ext> on disk. Any
// other value in the database is ignored, so it can never be used to delete
// another file. Failures are logged, not thrown: the database row is already gone.
export async function deleteUploadedFile(url: string, subfolder: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+$/.test(subfolder)) return;
  const ownPath = new RegExp(`^/uploads/${subfolder}/[0-9a-f-]{36}\\.(jpg|png|webp)$`);
  try {
    if (url.startsWith("https://")) {
      const parsed = new URL(url);
      if (!BLOB_HOST.test(parsed.hostname) || !ownPath.test(parsed.pathname)) return;
      if (!usesBlobStorage()) return;
      const { del } = await import("@vercel/blob");
      await del(url);
      return;
    }
    if (ownPath.test(url)) {
      await unlink(path.join(process.cwd(), "public", url));
    }
  } catch (error) {
    console.warn("Uploaded file not deleted:", error);
  }
}
