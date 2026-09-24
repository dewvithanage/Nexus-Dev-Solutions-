import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";


export async function saveFile(file: File, subfolder: string = "general"): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Clean filename and add timestamp to avoid duplicates
  const originalName = file.name || "file";
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${Date.now()}-${sanitizedName}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads", subfolder);

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


  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/${subfolder}/${filename}`;
}