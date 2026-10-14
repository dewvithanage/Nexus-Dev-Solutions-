
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ProductCard from "@/components/public/ProductCard";
import { getSearchProducts } from "@/lib/public-queries";

type SearchResultsPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchResultsPage({
  searchParams,
}: SearchResultsPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  let products: Awaited<
    ReturnType<typeof getSearchProducts>
  >["products"] = [];
  let totalCount = 0;
  let hasError = false;

  if (query && query.length <= 100) {
    try {
      const results = await getSearchProducts(query);
      products = results.products;
      totalCount = results.totalCount;
    } catch (error) {
      console.error("Search results error:", error);
      hasError = true;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900">
          {query
            ? `Search Results for "${query}"`
            : "Search Products"}
        </h1>

        {query && query.length <= 100 && !hasError && (
          <p className="mt-1 text-sm text-slate-500">
            {totalCount} products found
            {totalCount > products.length &&
              ` — showing ${products.length} products`}
          </p>
        )}

        <div className="mt-6">
          {!query ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Enter a search term in the search bar to find products.
            </div>
          ) : query.length > 100 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Your search term must be 100 characters or fewer.
            </div>
          ) : hasError ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-red-600">
              Unable to load search results. Please try again later.
            </div>
          ) : products.length === 0 ? (
           <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
  No products matched &ldquo;{query}&rdquo;. Try a different search term.
</div>
          ) : (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
