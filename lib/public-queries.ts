import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { publicProductWhere } from "@/lib/public-visibility";
import type { ProductCardData } from "@/components/public/ProductCard";

// Database queries for the public pages, run on the SERVER.
// Pages call these directly instead of fetching their own /api routes from
// the browser after the page has loaded.
//
// CACHING: each result is kept for 60 seconds. The tags let any route that
// changes the data (approving a product, adding a category, ...) call
// revalidateTag() so visitors see the change straight away instead of
// waiting for the 60 seconds to run out.
export const CACHE_TAGS = {
  categories: "categories",
  products: "products",
} as const;

// Cached values are stored as JSON, so they are converted to plain JSON up
// front. That keeps the shape identical on a cache miss and a cache hit, and
// turns Prisma's Decimal prices and Date values into plain strings (they
// cannot be passed to client components as they are).
function toPlain<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// One quiet retry. The free cloud database sometimes drops the first
// connection after being idle; the second attempt usually works. This keeps
// the "try once more" behaviour the old browser code had.
async function withRetry<T>(run: () => Promise<T>, retries = 1, delayMs = 800): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(run, retries - 1, delayMs);
  }
}

export type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

export const getHomeCategories = unstable_cache(
  async (): Promise<HomeCategory[]> => {
    const categories = await withRetry(() =>
      prisma.category.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { products: { where: publicProductWhere } } },
        },
      })
    );

    return categories.map((category) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  productCount: category._count.products,
}));
  },
  ["home-categories"],
  { revalidate: 60, tags: [CACHE_TAGS.categories, CACHE_TAGS.products] }
);

// The Home page's "Trending" strip: up to 4 of the best-rated, publicly
// visible products with an average of 4 stars or more.
export const getFeaturedProducts = unstable_cache(
  async (): Promise<ProductCardData[]> => {
    const products = await withRetry(() =>
      prisma.product.findMany({
        where: { ...publicProductWhere, ratingCount: { gt: 0 }, ratingAverage: { gte: 4 } },
        orderBy: [{ ratingAverage: "desc" }, { ratingCount: "desc" }],
        take: 4,
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          business: { select: { businessName: true } },
        },
      })
    );

    return toPlain<ProductCardData[]>(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.images[0]?.url ?? null,
        businessName: product.business.businessName,
        averageRating:
          product.ratingCount > 0 ? Number(product.ratingAverage.toFixed(1)) : null,
        reviewCount: product.ratingCount,
        createdAt: product.createdAt,
      }))
    );
  },
  ["home-featured-products"],
  { revalidate: 60, tags: [CACHE_TAGS.products] }
);
