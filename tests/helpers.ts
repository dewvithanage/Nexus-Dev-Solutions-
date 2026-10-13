import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { clearTestCookies, setTestCookie } from "./session-cookie";

export { prisma };

export const TEST_PASSWORD = "Password123";
const BASE_URL = "http://localhost:3000";

// ------------------------------------------------------------ sessions

// Puts a real signed session token for this user in the cookie jar, the
// same token /api/auth/login would set.
export async function signInAs(user: { id: string; role: "ENTREPRENEUR" | "ADMIN" }) {
  clearTestCookies();
  setTestCookie(SESSION_COOKIE_NAME, await createSessionToken({ userId: user.id, role: user.role }));
}

export function signOut() {
  clearTestCookies();
}

export async function sessionCookieFor(user: { id: string; role: "ENTREPRENEUR" | "ADMIN" }) {
  return `${SESSION_COOKIE_NAME}=${await createSessionToken({ userId: user.id, role: user.role })}`;
}

// ------------------------------------------------------------ database

// Empties every table between tests. Fixed SQL, no user input.
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE "Notification", "Review", "SalesConfirmation", "OrderItem", "Order",
      "ProductImage", "Product", "Category", "Business", "EntrepreneurProfile",
      "GalleryItem", "ContentBlock", "User"
    RESTART IDENTITY CASCADE
  `);
}

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function createEntrepreneur(
  options: { status?: "PENDING" | "APPROVED" | "REJECTED"; email?: string; businessName?: string } = {}
) {
  const id = unique();
  const user = await prisma.user.create({
    data: {
      email: options.email ?? `entrepreneur-${id}@example.com`,
      name: `Entrepreneur ${id}`,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: "ENTREPRENEUR",
      entrepreneurProfile: {
        create: {
          whatsappNumber: "+94771234567",
          status: options.status ?? "APPROVED",
          business: { create: { businessName: options.businessName ?? `Shop ${id}` } },
        },
      },
    },
    include: { entrepreneurProfile: { include: { business: true } } },
  });

  return {
    user,
    profile: user.entrepreneurProfile!,
    business: user.entrepreneurProfile!.business!,
  };
}

export async function createAdmin() {
  const id = unique();
  return prisma.user.create({
    data: {
      email: `admin-${id}@example.com`,
      name: `Admin ${id}`,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: "ADMIN",
    },
  });
}

export async function createCategory() {
  const id = unique();
  return prisma.category.create({ data: { name: `Category ${id}`, slug: `category-${id}` } });
}

export async function createProduct(
  businessId: string,
  categoryId: string,
  overrides: Partial<{ status: "PENDING" | "APPROVED" | "REJECTED"; price: number; rejectionReason: string }> = {}
) {
  return prisma.product.create({
    data: {
      businessId,
      categoryId,
      name: `Product ${unique()}`,
      description: "A test product",
      price: overrides.price ?? 500,
      stockQuantity: 10,
      status: overrides.status ?? "APPROVED",
      rejectionReason: overrides.rejectionReason,
    },
  });
}

export async function createOrder(
  businessId: string,
  productId: string,
  options: { status?: "PENDING" | "AWAITING_FULFILLMENT" | "PENDING_VERIFICATION" | "VERIFIED" | "FLAGGED" | "CANCELLED"; quantity?: number; unitPrice?: number } = {}
) {
  const quantity = options.quantity ?? 1;
  const unitPrice = options.unitPrice ?? 500;
  return prisma.order.create({
    data: {
      businessId,
      buyerName: "Guest Buyer",
      buyerPhone: "+94770000000",
      deliveryLocation: "Library",
      totalAmount: quantity * unitPrice,
      status: options.status ?? "PENDING",
      items: { create: { productId, quantity, unitPriceAtOrder: unitPrice } },
    },
  });
}

// ------------------------------------------------------------ requests

export function jsonRequest(pathname: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`${BASE_URL}${pathname}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function formRequest(pathname: string, formData: FormData) {
  return new NextRequest(`${BASE_URL}${pathname}`, { method: "POST", body: formData });
}

export function getRequest(pathname: string) {
  return new NextRequest(`${BASE_URL}${pathname}`);
}

export function params<T extends Record<string, string>>(values: T) {
  return { params: Promise.resolve(values) };
}

// ------------------------------------------------------------ uploads

// Smallest byte sequences lib/upload.ts recognises as real images.
export function pngFile(name = "photo.png") {
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  return new File([bytes], name, { type: "image/png" });
}

// Text pretending to be a PNG: right name and type, wrong content.
export function fakePngFile() {
  return new File(["<html><script>alert(1)</script></html>"], "evil.png", { type: "image/png" });
}

export function uploadedFileExists(url: string) {
  return fs.existsSync(path.join(process.cwd(), "public", url));
}

// Removes every file the tests uploaded into public/uploads.
export async function removeUploadedTestFiles() {
  const [images, confirmations, businesses] = await Promise.all([
    prisma.productImage.findMany({ select: { url: true } }),
    prisma.salesConfirmation.findMany({ select: { proofImageUrl: true } }),
    prisma.business.findMany({ where: { logoUrl: { not: null } }, select: { logoUrl: true } }),
  ]);
  const urls = [
    ...images.map((row) => row.url),
    ...confirmations.map((row) => row.proofImageUrl),
    ...businesses.map((row) => row.logoUrl!),
  ];
  for (const url of urls) {
    if (url.startsWith("/uploads/")) {
      fs.rmSync(path.join(process.cwd(), "public", url), { force: true });
    }
  }
}
