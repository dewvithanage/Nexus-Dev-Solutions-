
import MarketplaceClient from "./MarketplaceClient";
import {
  getHomeCategories,
  getMarketplaceProducts,
} from "@/lib/public-queries";

export const revalidate = 60;

export default async function MarketplacePage() {
  const [categories, result] = await Promise.all([
    getHomeCategories(),
    getMarketplaceProducts("", 5000, "newest", 1),
  ]);

  return (
    <MarketplaceClient
      initialProducts={result.products}
      initialCategories={categories}
      initialPagination={result.pagination}
    />
  );
}
