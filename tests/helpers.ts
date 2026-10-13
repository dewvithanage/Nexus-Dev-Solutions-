import { existsSync, rmSync } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Shared helpers for route tests. Any team member can import these to test
// their own endpoints.

const cookieJar = (globalThis as { __testCookieJar?: Map<string, string> }).__testCookieJar!;

export const TEST_PASSWORD = "Password123";

// Empties every table (except Prisma's migration history) so each test
// starts from a known state.
export async function resetDatabase() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  // Table names come from pg_tables, not from user input.
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
  signOut();
}

let counter = 0;
const uniqueEmail = (prefix: string) => `${prefix}${++counter}-${Date.now()}@example.com`;

export async function createAdmin() {
  return prisma.user.create({
    data: {
      name: "Test Admin",
      email: uniqueEmail("admin"),
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: "ADMIN",
    },
  });
}

export async function createEntrepreneur(status: "PENDING" | "APPROVED" | "REJECTED" = "APPROVED") {
  return prisma.user.create({
    data: {
      name: "Test Entrepreneur",
      email: uniqueEmail("entrepreneur"),
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: "ENTREPRENEUR",
      entrepreneurProfile: {
        create: {
          whatsappNumber: "0771234567",
          status,
          business: { create: { businessName: "Test Business" } },
        },
      },
    },
    include: { entrepreneurProfile: { include: { business: true } } },
  });
}

// Makes the next Route Handler call run as this user, exactly as if the
// browser sent a valid session cookie.
export async function signInAs(user: { id: string; role: "ADMIN" | "ENTREPRENEUR" }) {
  cookieJar.set(SESSION_COOKIE_NAME, await sessionTokenFor(user));
}

// A valid session token for this user, carrying their current sessionVersion.
export async function sessionTokenFor(user: { id: string; role: "ADMIN" | "ENTREPRENEUR" }) {
  const { sessionVersion } = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { sessionVersion: true },
  });
  return createSessionToken({ userId: user.id, role: user.role, sessionVersion });
}

// The secret columns are hidden from normal queries (lib/prisma.ts); tests
// that need to check them ask for them here.
export function userWithSecrets(id: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    omit: { passwordHash: false, resetToken: false, resetTokenExpiry: false, sessionVersion: false },
  });
}

export function signOut() {
  cookieJar.clear();
}

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function formRequest(url: string, method: string, form: FormData) {
  return new NextRequest(new URL(url, "http://localhost"), { method, body: form });
}

export function routeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

// Smallest valid PNG (1x1 pixel), for upload tests.
export function tinyPngFile(name = "pixel.png") {
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  return new File([bytes], name, { type: "image/png" });
}

export async function createCategory(name = `Category ${++counter}`) {
  return prisma.category.create({
    data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
  });
}

export async function createProduct(
  businessId: string,
  { status = "APPROVED", stockQuantity = 10, price = 500 }: {
    status?: "PENDING" | "APPROVED" | "REJECTED";
    stockQuantity?: number;
    price?: number;
  } = {}
) {
  const category = await createCategory();
  return prisma.product.create({
    data: {
      businessId,
      categoryId: category.id,
      name: `Product ${++counter}`,
      description: "A test product.",
      price,
      stockQuantity,
      status,
    },
  });
}

// An order for one unit of the product, in the given state.
export async function createOrder(
  businessId: string,
  productId: string,
  status: "PENDING" | "PENDING_VERIFICATION" | "VERIFIED" = "PENDING"
) {
  return prisma.order.create({
    data: {
      businessId,
      buyerName: "Test Buyer",
      buyerPhone: "0771234567",
      deliveryLocation: "Main library",
      totalAmount: 500,
      status,
      items: { create: { productId, quantity: 1, unitPriceAtOrder: 500 } },
    },
  });
}

// Text pretending to be a PNG: right name and type, wrong content.
export function fakePngFile() {
  return new File(["<html><script>alert(1)</script></html>"], "evil.png", { type: "image/png" });
}

// Uploads land in public/uploads; tests check the file and then remove it.
export function uploadedFileExists(url: string) {
  return existsSync(path.join(process.cwd(), "public", url));
}

export async function removeUploadedTestFiles() {
  const [images, proofs, logos] = await Promise.all([
    prisma.productImage.findMany({ select: { url: true } }),
    prisma.salesConfirmation.findMany({ select: { proofImageUrl: true } }),
    prisma.business.findMany({ where: { logoUrl: { not: null } }, select: { logoUrl: true } }),
  ]);
  const urls = [...images.map((i) => i.url), ...proofs.map((p) => p.proofImageUrl), ...logos.map((l) => l.logoUrl!)];
  for (const url of urls) {
    if (url.startsWith("/uploads/")) rmSync(path.join(process.cwd(), "public", url), { force: true });
  }
}
