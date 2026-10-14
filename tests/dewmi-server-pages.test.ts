import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Gallery from "@/app/gallery/page";
import Reviews from "@/app/products/[productId]/reviews/page";
import { getGalleryPage, getOrderConfirmation, getReviewProduct, getReviewsPage, pageNumber } from "@/lib/dewmi-page-data";

const db = vi.hoisted(() => ({ gallery: vi.fn(), count: vi.fn(), product: vi.fn(), reviews: vi.fn(), groups: vi.fn(), order: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $disconnect: async () => undefined,
  galleryItem: { findMany: db.gallery, count: db.count }, product: { findFirst: db.product },
  review: { findMany: db.reviews, groupBy: db.groups }, order: { findUnique: db.order },
} }));
vi.mock("@/components/public/Navbar", () => ({ default: () => null }));
vi.mock("@/components/public/Footer", () => ({ default: () => null }));
beforeEach(() => {
  vi.resetAllMocks();
  db.gallery.mockResolvedValue([]); db.count.mockResolvedValue(0);
  db.product.mockResolvedValue({ id: "product-1", name: "Campus bag", business: { businessName: "Campus shop" } });
  db.reviews.mockResolvedValue([]); db.groups.mockResolvedValue([]);
});
describe("Dewmi server rendering and query isolation", () => {
  it("renders database gallery content in the initial HTML", async () => {
    db.gallery.mockResolvedValue([{ id: "image-1", imageUrl: "/images/new-hero.png", caption: "Campus event" }]);
    db.count.mockResolvedValue(1);
    const html = renderToStaticMarkup(await Gallery({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Campus event");
    expect(db.gallery).toHaveBeenCalledWith(expect.objectContaining({ take: 24, skip: 0,
      select: { id: true, imageUrl: true, caption: true } }));
  });
  it("limits gallery pages and fetches the count alongside the list", async () => {
    await getGalleryPage(2);
    expect(db.gallery).toHaveBeenCalledWith(expect.objectContaining({ take: 24, skip: 24 }));
    expect(db.count).toHaveBeenCalledOnce();
  });
  it("renders database review content in the initial HTML", async () => {
    db.reviews.mockResolvedValue([{ id: "review-1", reviewerName: "Campus buyer", rating: 5, comment: "Excellent craftsmanship", createdAt: new Date("2026-10-15T00:00:00Z") }]);
    db.groups.mockResolvedValue([{ rating: 5, _count: 1 }]);
    const html = renderToStaticMarkup(await Reviews({ params: Promise.resolve({ productId: "product-1" }), searchParams: Promise.resolve({}) }));
    expect(html).toContain("Excellent craftsmanship");
    expect(html).toContain("Campus buyer");
  });
  it("paginates reviews while computing summary across all reviews", async () => {
    db.groups.mockResolvedValue([{ rating: 4, _count: 21 }]);
    const data = await getReviewsPage("product-1", 2);
    expect(data?.summary.totalReviews).toBe(21);
    expect(data?.totalPages).toBe(2);
    expect(db.reviews).toHaveBeenCalledWith(expect.objectContaining({ take: 20, skip: 20 }));
  });
  it("hides missing or unpublished products before querying their reviews", async () => {
    db.product.mockResolvedValue(null);
    expect(await getReviewsPage("hidden-product", 1)).toBeNull();
    expect(db.reviews).not.toHaveBeenCalled();
    expect(db.product).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "APPROVED" }) }));
  });
  it("rejects malformed identifiers and order tokens without database access", async () => {
    expect(await getReviewProduct("<invalid>")).toBeNull();
    expect(await getOrderConfirmation("order-1", "invalid")).toBeNull();
    expect(db.product).not.toHaveBeenCalled(); expect(db.order).not.toHaveBeenCalled();
  });
  it("returns no guest order data when the access token belongs to another order", async () => {
    db.order.mockResolvedValue({ accessToken: "a".repeat(48) });
    expect(await getOrderConfirmation("order-1", "b".repeat(48))).toBeNull();
  });
  it.each([undefined, "0", "-1", "1.5", "100001", "abc"])("bounds invalid page value %s", (value) => {
    expect(pageNumber(value)).toBe(1);
  });
});
