import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Saves an uploaded file under /public/uploads/<subfolder>/
// and returns the public URL.
export async function saveUploadedFile(
  file: File,
  subfolder: string
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    subfolder
  );

  await mkdir(uploadsDir, { recursive: true });

  // Random filename prevents duplicate file-name conflicts.
  const extension = path.extname(file.name) || ".jpg";
  const filename = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadsDir, filename);

  await writeFile(filePath, buffer);

  return `/uploads/${subfolder}/${filename}`;
}