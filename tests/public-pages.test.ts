import { isValidElement, type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MarketplacePage from "@/app/marketplace/page";
import MarketplaceClient from "@/app/marketplace/MarketplaceClient";
import SearchResultsPage from "@/app/marketplace/search/page";
import CategoriesPage from "@/app/categories/(list)/page";
import CategoryDetailsPage from "@/app/categories/[slug]/page";
import ProductDetailsPage, { generateMetadata } from "@/app/products/[productId]/page";
import ProductDetailsClient from "@/app/products/[productId]/ProductDetailsClient";
import ProductCard from "@/components/public/ProductCard";
import { GET as listMarketplaceProducts } from "@/app/api/marketplace/products/route";
import { GET as listCategories } from "@/app/api/categories/route";
import { GET as getPublicProduct } from "@/app/api/products/[productId]/route";
import { getFeaturedProducts, getHomeCategories } from "@/lib/public-queries";
import { prisma } from "@/lib/prisma";
import { createCategory, createEntrepreneur, jsonRequest, resetDatabase, routeParams } from "./helpers";

// Public storefront: Home, Marketplace, Search results, Categories,
// Category details and Product details (server pages and their API routes).

// unstable_cache needs the Next.js server's cache; outside it, run the query
// straight through so every test sees the database as it is right now.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => {},
}));

beforeEach(resetDatabase);

let created = 0;

// A product with full control over the fields these pages sort and filter on.
async function listProduct(
  businessId: string,
  {
    name = `Product ${++created}`,
    description = "A test product.",
    price = 500,
    status = "APPROVED",
    categoryId,
    tags = [],
    ratingAverage = 0,
    ratingCount = 0,
    createdAt = new Date(Date.now() + ++created * 1000),
  }: {
    name?: string;
    description?: string;
    price?: number;
    status?: "PENDING" | "APPROVED" | "REJECTED";
    categoryId?: string;
    tags?: string[];
    ratingAverage?: number;
    ratingCount?: number;
    createdAt?: Date;
  } = {}
) {
  return prisma.product.create({
    data: {
      businessId,
      categoryId: categoryId ?? (await createCategory()).id,
      name,
      description,
      price,
      stockQuantity: 10,
      tags,
      ratingAverage,
      ratingCount,
      status,
      createdAt,
    },
  });
}

async function sellerBusinessId(status: "PENDING" | "APPROVED" | "REJECTED" = "APPROVED") {
  const seller = await createEntrepreneur(status);
  return seller.entrepreneurProfile!.business!.id;
}

// notFound() works by throwing; this tells whether the page asked for a 404.
async function isNotFound(render: () => Promise<unknown>) {
  try {
    await render();
    return false;
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    if (!digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) throw error;
    return true;
  }
}

// All the text a page returns, without rendering its child components.
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (!isValidElement(node)) return "";
  return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
}

// Props of every element of the given component type in the returned tree.
function propsOf<P>(node: ReactNode, type: unknown): P[] {
  if (Array.isArray(node)) return node.flatMap((child) => propsOf<P>(child, type));
  if (!isValidElement(node)) return [];
  const element = node as ReactElement<{ children?: ReactNode }>;
  const here = element.type === type ? [element.props as P] : [];
  return [...here, ...propsOf<P>(element.props.children, type)];
}

const cardNames = (tree: ReactNode) =>
  propsOf<{ product: { name: string } }>(tree, ProductCard).map((props) => props.product.name);

const marketplaceRequest = (query = "") => jsonRequest(`/api/marketplace/products${query}`, "GET");

describe("Home page data", () => {
  it("lists categories alphabetically, counting only publicly visible products", async () => {
    const approved = await sellerBusinessId();
    const pendingSeller = await sellerBusinessId("PENDING");
    const tech = await createCategory("Tech");
    const art = await createCategory("Art");
    await listProduct(approved, { categoryId: tech.id });
    await listProduct(approved, { categoryId: tech.id, status: "PENDING" });
    await listProduct(pendingSeller, { categoryId: tech.id });

    const categories = await getHomeCategories();

    expect(categories.map((c) => c.name)).toEqual(["Art", "Tech"]);
    expect(categories.find((c) => c.id === art.id)!.productCount).toBe(0);
    expect(categories.find((c) => c.id === tech.id)!.productCount).toBe(1);
  });

  it("trending shows at most 4 public products rated 4+ stars, best first", async () => {
    const business = await sellerBusinessId();
    const hiddenSeller = await sellerBusinessId("REJECTED");
    await listProduct(business, { name: "Rated 4.2", ratingAverage: 4.2, ratingCount: 3 });
    await listProduct(business, { name: "Rated 5", ratingAverage: 5, ratingCount: 1 });
    await listProduct(business, { name: "Rated 4.8", ratingAverage: 4.8, ratingCount: 10 });
    await listProduct(business, { name: "Rated 4.5", ratingAverage: 4.5, ratingCount: 2 });
    await listProduct(business, { name: "Rated 4.1", ratingAverage: 4.1, ratingCount: 2 });
    await listProduct(business, { name: "Rated 3.9", ratingAverage: 3.9, ratingCount: 50 });
    await listProduct(business, { name: "Unrated" });
    await listProduct(business, { name: "Pending 5", ratingAverage: 5, ratingCount: 9, status: "PENDING" });
    await listProduct(hiddenSeller, { name: "Hidden seller 5", ratingAverage: 5, ratingCount: 9 });

    const products = await getFeaturedProducts();

    expect(products.map((p) => p.name)).toEqual(["Rated 5", "Rated 4.8", "Rated 4.5", "Rated 4.2"]);
    expect(products[1]).toMatchObject({ averageRating: 4.8, reviewCount: 10, businessName: "Test Business" });
  });

  it("trending is empty when nothing is rated 4 stars or more", async () => {
    await listProduct(await sellerBusinessId(), { ratingAverage: 3, ratingCount: 4 });
    expect(await getFeaturedProducts()).toEqual([]);
  });
});

describe("Marketplace page", () => {
  it("hands the client the newest public products, 4 per page, with pagination", async () => {
    const business = await sellerBusinessId();
    for (let i = 1; i <= 5; i++) await listProduct(business, { name: `Item ${i}` });
    await listProduct(business, { name: "Not approved", status: "PENDING" });

    const tree = await MarketplacePage();
    const [props] = propsOf<{
      initialProducts: { name: string }[];
      initialCategories: unknown[];
      initialPagination: { currentPage: number; totalPages: number; totalCount: number };
    }>(tree, MarketplaceClient);

    expect(props.initialProducts.map((p) => p.name)).toEqual(["Item 5", "Item 4", "Item 3", "Item 2"]);
    expect(props.initialPagination).toMatchObject({ currentPage: 1, totalPages: 2, totalCount: 5 });
    expect(props.initialCategories).toHaveLength(await prisma.category.count());
  });
});

describe("GET /api/marketplace/products", () => {
  it("only returns publicly visible products", async () => {
    await listProduct(await sellerBusinessId(), { name: "Visible" });
    await listProduct(await sellerBusinessId(), { name: "Rejected product", status: "REJECTED" });
    await listProduct(await sellerBusinessId("PENDING"), { name: "Pending seller" });

    const body = await (await listMarketplaceProducts(marketplaceRequest())).json();

    expect(body.products.map((p: { name: string }) => p.name)).toEqual(["Visible"]);
    expect(body.pagination).toEqual({ currentPage: 1, totalPages: 1, totalCount: 1, pageSize: 4 });
  });

  it("filters by category slug and price range", async () => {
    const business = await sellerBusinessId();
    const cakes = await createCategory("Cakes");
    await listProduct(business, { name: "Cheap cake", price: 200, categoryId: cakes.id });
    await listProduct(business, { name: "Mid cake", price: 800, categoryId: cakes.id });
    await listProduct(business, { name: "Pricey cake", price: 3000, categoryId: cakes.id });
    await listProduct(business, { name: "Mid other", price: 800 });

    const body = await (
      await listMarketplaceProducts(marketplaceRequest("?category=cakes&minPrice=500&maxPrice=1000"))
    ).json();

    expect(body.products.map((p: { name: string }) => p.name)).toEqual(["Mid cake"]);
  });

  it("searches name, description and tags, ignoring case in name and description", async () => {
    const business = await sellerBusinessId();
    await listProduct(business, { name: "Chocolate Brownie" });
    await listProduct(business, { name: "Box", description: "Full of CHOCOLATE chips" });
    await listProduct(business, { name: "Gift", tags: ["chocolate"] });
    await listProduct(business, { name: "Keyboard" });

    const body = await (await listMarketplaceProducts(marketplaceRequest("?q=chocolate"))).json();

    expect(body.products.map((p: { name: string }) => p.name).sort()).toEqual(["Box", "Chocolate Brownie", "Gift"]);
  });

  it("sorts by price and by rating across all pages", async () => {
    const business = await sellerBusinessId();
    await listProduct(business, { name: "B", price: 300, ratingAverage: 3, ratingCount: 1 });
    await listProduct(business, { name: "A", price: 100, ratingAverage: 5, ratingCount: 1 });
    await listProduct(business, { name: "C", price: 200, ratingAverage: 4, ratingCount: 1 });

    const names = async (sort: string) =>
      (await (await listMarketplaceProducts(marketplaceRequest(`?sort=${sort}`))).json()).products.map(
        (p: { name: string }) => p.name
      );

    expect(await names("price_asc")).toEqual(["A", "C", "B"]);
    expect(await names("price_desc")).toEqual(["B", "C", "A"]);
    expect(await names("rating")).toEqual(["A", "C", "B"]);
  });

  it("pages through results", async () => {
    const business = await sellerBusinessId();
    for (let i = 1; i <= 5; i++) await listProduct(business, { name: `Item ${i}` });

    const body = await (await listMarketplaceProducts(marketplaceRequest("?page=2&pageSize=2"))).json();

    expect(body.products.map((p: { name: string }) => p.name)).toEqual(["Item 3", "Item 2"]);
    expect(body.pagination).toEqual({ currentPage: 2, totalPages: 3, totalCount: 5, pageSize: 2 });
  });

  it("featured=true returns the Home page's trending products", async () => {
    const business = await sellerBusinessId();
    await listProduct(business, { name: "Top", ratingAverage: 4.5, ratingCount: 2 });
    await listProduct(business, { name: "Low", ratingAverage: 2, ratingCount: 2 });

    const body = await (await listMarketplaceProducts(marketplaceRequest("?featured=true"))).json();

    expect(body.products.map((p: { name: string }) => p.name)).toEqual(["Top"]);
  });

  it.each([
    ["?minPrice=900&maxPrice=100", "min above max"],
    ["?sort=cheapest", "unknown sort"],
    ["?maxPrice=abc", "non-numeric price"],
    ["?page=0", "page below 1"],
    ["?pageSize=49", "page size over the cap"],
    [`?q=${"a".repeat(101)}`, "search text over 100 characters"],
  ])("rejects %s (%s) with 400", async (query) => {
    expect((await listMarketplaceProducts(marketplaceRequest(query))).status).toBe(400);
  });
});

describe("Search results page", () => {
  const search = (q?: string) => SearchResultsPage({ searchParams: Promise.resolve(q === undefined ? {} : { q }) });

  it("asks for a search term when there is none", async () => {
    const text = textOf(await search("   "));
    expect(text).toContain("Search Products");
    expect(text).toContain("Enter a search term");
  });

  it("shows matching public products by name, ignoring case", async () => {
    const business = await sellerBusinessId();
    await listProduct(business, { name: "Blue Tote Bag" });
    await listProduct(business, { name: "Red tote" });
    await listProduct(business, { name: "Tote draft", status: "PENDING" });
    await listProduct(business, { name: "Mug" });

    const tree = await search("TOTE");

    expect(cardNames(tree).sort()).toEqual(["Blue Tote Bag", "Red tote"]);
    expect(textOf(tree)).toContain('Search Results for "TOTE"');
    expect(textOf(tree)).toContain("2 products found");
  });

  it("says nothing matched when there are no results", async () => {
    const tree = await search("unicorn");
    expect(cardNames(tree)).toEqual([]);
    expect(textOf(tree)).toContain("No products matched");
  });

  it("refuses search terms over 100 characters", async () => {
    expect(textOf(await search("x".repeat(101)))).toContain("must be 100 characters or fewer");
  });
});

describe("Categories page and GET /api/categories", () => {
  it("lists every category with its public product count", async () => {
    const business = await sellerBusinessId();
    const bakes = await createCategory("Bakes");
    await createCategory("Art");
    await listProduct(business, { categoryId: bakes.id });
    await listProduct(business, { categoryId: bakes.id });
    await listProduct(business, { categoryId: bakes.id, status: "REJECTED" });

    const text = textOf(await CategoriesPage());
    expect(text).toContain("Bakes");
    expect(text).toContain("2 Products");

    const body = await (await listCategories()).json();
    expect(body.categories).toEqual([
      expect.objectContaining({ name: "Art", slug: "art", productCount: 0 }),
      expect.objectContaining({ name: "Bakes", slug: "bakes", productCount: 2 }),
    ]);
  });

  it("shows an empty state when there are no categories", async () => {
    expect(textOf(await CategoriesPage())).toContain("No categories available yet.");
  });
});

describe("Category details page", () => {
  const open = (slug: string) => CategoryDetailsPage({ params: Promise.resolve({ slug }) });

  it("shows only that category's public products, newest first", async () => {
    const business = await sellerBusinessId();
    const tech = await createCategory("Tech");
    await listProduct(business, { name: "Old gadget", categoryId: tech.id });
    await listProduct(business, { name: "New gadget", categoryId: tech.id });
    await listProduct(business, { name: "Pending gadget", categoryId: tech.id, status: "PENDING" });
    await listProduct(await sellerBusinessId("REJECTED"), { name: "Hidden gadget", categoryId: tech.id });
    await listProduct(business, { name: "Other category" });

    const tree = await open("tech");

    expect(cardNames(tree)).toEqual(["New gadget", "Old gadget"]);
    expect(textOf(tree)).toContain("2 products in this category");
  });

  it("shows an empty state for a category with no public products", async () => {
    await createCategory("Empty");
    expect(textOf(await open("empty"))).toContain("No approved products in this category yet.");
  });

  it("returns 404 for an unknown slug", async () => {
    expect(await isNotFound(() => open("does-not-exist"))).toBe(true);
  });
});

describe("Product details page", () => {
  const params = (productId: string) => ({ params: Promise.resolve({ productId }) });

  it("passes the product, its seller and rating to the client component", async () => {
    const business = await sellerBusinessId();
    const product = await listProduct(business, { name: "Desk Lamp", price: 1250.5, ratingAverage: 4.25, ratingCount: 4 });

    const tree = await ProductDetailsPage(params(product.id));
    const [{ product: shown }] = propsOf<{ product: Record<string, unknown> }>(tree, ProductDetailsClient);

    expect(shown).toMatchObject({
      id: product.id,
      name: "Desk Lamp",
      price: 1250.5,
      averageRating: 4.3,
      reviewCount: 4,
      business: { id: business, businessName: "Test Business" },
    });
    expect((await generateMetadata(params(product.id))).title).toBe("Desk Lamp | StartupSpark");
  });

  it("returns 404 for unknown, unapproved, or hidden-seller products", async () => {
    const pending = await listProduct(await sellerBusinessId(), { status: "PENDING" });
    const hiddenSeller = await listProduct(await sellerBusinessId("PENDING"));

    for (const id of ["nope", pending.id, hiddenSeller.id]) {
      expect(await isNotFound(() => ProductDetailsPage(params(id)))).toBe(true);
    }
    expect((await generateMetadata(params("nope"))).title).toBe("Product Not Found | StartupSpark");
  });
});

describe("GET /api/products/[productId]", () => {
  it("returns a public product without admin notes or the seller's account details", async () => {
    const seller = await createEntrepreneur();
    const product = await listProduct(seller.entrepreneurProfile!.business!.id);
    await prisma.product.update({ where: { id: product.id }, data: { adminNotes: "internal-note-xyz" } });

    const response = await getPublicProduct(jsonRequest("/x", "GET"), routeParams({ productId: product.id }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(text).product).toMatchObject({ id: product.id, averageRating: null, reviewCount: 0 });
    expect(text).not.toContain("internal-note-xyz");
    expect(text).not.toContain(seller.email);
    expect(text).not.toMatch(/passwordHash|resetToken/);
  });

  it("returns 404 for unknown, malformed and unapproved ids", async () => {
    const pending = await listProduct(await sellerBusinessId(), { status: "PENDING" });

    for (const productId of ["nope", "../etc/passwd", pending.id]) {
      const response = await getPublicProduct(jsonRequest("/x", "GET"), routeParams({ productId }));
      expect(response.status).toBe(404);
    }
  });
});
