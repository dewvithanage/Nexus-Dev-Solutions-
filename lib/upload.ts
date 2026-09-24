import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// Saves an uploaded file under /public/uploads/<subfolder>/ and returns
// the public URL to it (anything under /public is served at the site
// root by Next.js automatically, so no extra route is needed to view it).
//
// LIMITATION (documented, not a bug): this writes to the local disk,
// which works fine for local development and a self-hosted demo, but
// will NOT persist on serverless hosts like Vercel (their filesystem is
// wiped between requests). If the team deploys there later, swap this
// for a real file storage service (e.g. Vercel Blob, S3, Cloudinary).
export async function saveUploadedFile(file: File, subfolder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadsDir, { recursive: true });

  // Random filename so two people uploading "photo.jpg" never collide.
  const extension = path.extname(file.name) || ".jpg";
  const filename = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadsDir, filename);

  await writeFile(filePath, buffer);

  return `/uploads/${subfolder}/${filename}`;
}
}
