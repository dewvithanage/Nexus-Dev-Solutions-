import { writeFile, mkdir } from "fs/promises";
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

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

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
    throw new UploadValidationError("The file is too large. The maximum size is 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const extension = detectImageExtension(buffer);
  if (!extension) {
    throw new UploadValidationError("Only JPG, PNG or WebP images are allowed.");
  }

  return { buffer, extension };
}

// Saves an uploaded image under /public/uploads/<subfolder>/ and returns the
// public URL. "subfolder" is always a fixed word chosen by our own code
// (e.g. "gallery"), but it is checked anyway so a future caller can never
// use it to write outside the uploads folder.
export async function saveUploadedFile(file: File, subfolder: string): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(subfolder)) {
    throw new Error("Invalid upload folder.");
  }

  const { buffer, extension } = await readAndValidateImage(file);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${crypto.randomUUID()}${extension}`;
  await writeFile(path.join(uploadsDir, filename), buffer);

  return `/uploads/${subfolder}/${filename}`;
}

// Older name kept so any file still importing it keeps working. Same
// validation and the same random filename as saveUploadedFile.
export async function saveFile(file: File, subfolder: string = "general"): Promise<string> {
  return saveUploadedFile(file, subfolder);
}
