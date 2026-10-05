import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Saves an uploaded file under /public/uploads/<subfolder>/ and returns
// the public URL. Filename is timestamp-based with the original name
// sanitized, to keep it somewhat readable while still avoiding clashes.
export async function saveFile(file: File, subfolder: string = "general"): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const originalName = file.name || "file";
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${Date.now()}-${sanitizedName}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/${subfolder}/${filename}`;
}

// Same purpose as saveFile above, but with a fully random UUID filename
// instead of a sanitized original name — this is the one actually
// called throughout the app (Gallery, Add Product, Business logo,
// Sales confirmation proof, etc.), since a random name avoids ever
// needing to sanitize/guess at the original file's name at all.
export async function saveUploadedFile(file: File, subfolder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadsDir, { recursive: true });

  const extension = path.extname(file.name) || ".jpg";
  const filename = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadsDir, filename);

  await writeFile(filePath, buffer);

  return `/uploads/${subfolder}/${filename}`;
}
