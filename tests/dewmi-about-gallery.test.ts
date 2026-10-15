import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import AboutStats from "@/components/public/AboutStats";
import { GET as gallery } from "@/app/api/gallery/route";
import { prisma } from "@/lib/prisma";
import { createAdmin, createEntrepreneur, createOrder, createProduct, resetDatabase } from "./helpers";

beforeEach(resetDatabase);
function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (isValidElement(node)) return text((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

describe("Dewmi About and Gallery", () => {
  it("About shows counts from the database and excludes unapproved sellers and products", async () => {
    const seller = await createEntrepreneur();
    const pending = await createEntrepreneur("PENDING");
    const product = await createProduct(seller.entrepreneurProfile!.business!.id);
    await createProduct(pending.entrepreneurProfile!.business!.id);
    await createOrder(seller.entrepreneurProfile!.business!.id, product.id, "VERIFIED");
    await createOrder(seller.entrepreneurProfile!.business!.id, product.id, "PENDING");
    const content = text(await AboutStats()).replace(/\s+/g, " ");
    expect(content).toContain("1 Student Entrepreneurs");
    expect(content).toContain("1 Products Listed");
    expect(content).toContain("1 Items Sold");
    expect(content).toContain("2 Categories");
  });

  it("Gallery returns an empty database as an empty list", async () => {
    const response = await gallery();
    expect(response.status).toBe(200);
    expect((await response.json()).galleryItems).toEqual([]);
  });

  it("Gallery reads saved images without requiring a customer account", async () => {
    const admin = await createAdmin();
    const item = await prisma.galleryItem.create({ data: {
      imageUrl: "/uploads/gallery/test.png", caption: "Campus marketplace", uploadedById: admin.id,
    } });
    const response = await gallery();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.galleryItems).toHaveLength(1);
    expect(body.galleryItems[0]).toMatchObject({ id: item.id, imageUrl: item.imageUrl, caption: item.caption });
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(JSON.stringify(body)).not.toContain(admin.email);
  });
});
