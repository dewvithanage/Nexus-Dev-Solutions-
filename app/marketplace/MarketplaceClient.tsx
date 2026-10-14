
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ProductCard, {
  type ProductCardData,
} from "@/components/public/ProductCard";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Pagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
};

type MarketplaceClientProps = {
  initialProducts: ProductCardData[];
  initialCategories: Category[];
  initialPagination: Pagination;
};

export default function MarketplaceClient({
  initialProducts,
  initialCategories,
  initialPagination,
}: MarketplaceClientProps) {
  const [products, setProducts] =
    useState<ProductCardData[]>(initialProducts);

  const [categories] = useState<Category[]>(initialCategories);

  const [pagination, setPagination] =
    useState<Pagination>(initialPagination);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initialRender = useRef(true);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Reset pagination when a filter or sort option changes.
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, maxPrice, sort]);

  // Fetch updated products when filters, sorting, or pagination change.
  useEffect(() => {
    // The first render already has data from the server.
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (selectedCategory) {
          params.set("category", selectedCategory);
        }

        if (maxPrice < 5000) {
          params.set("maxPrice", String(maxPrice));
        }

        params.set("sort", sort);
        params.set("page", String(page));

        const response = await fetch(
          `/api/marketplace/products?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data = await response.json();

        if (!Array.isArray(data.products) || !data.pagination) {
          throw new Error("Invalid product response.");
        }

        setProducts(data.products);
        setPagination(data.pagination);
      } catch (err) {
        // Ignore requests cancelled because the user changed a filter.
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Load marketplace products error:", err);

        setError(
          "We couldn't load the products. Please check your connection and try again."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
      }
    }

    loadProducts();

    return () => {
      controller.abort();
    };
  }, [selectedCategory, maxPrice, sort, page, retryCount]);

  // Build a compact page-number list.
  function getPageNumbers(
    current: number,
    total: number
  ): (number | "...")[] {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [1];

    if (current > 3) {
      pages.push("...");
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push("...");
    }

    pages.push(total);

    return pages;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <p className="mb-5 text-sm text-slate-500">
          Showing {products.length} of {pagination.totalCount} products
        </p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
          {/* Filters sidebar */}
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div
              className={`flex items-center justify-between ${
                filtersOpen ? "mb-4" : "lg:mb-4"
              }`}
            >
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="marketplace-filters"
                className="flex items-center gap-2 lg:pointer-events-none"
              >
                <SlidersHorizontal
                  size={15}
                  className="text-slate-500 lg:hidden"
                />

                <h2 className="text-sm font-bold text-slate-900">
                  Filters
                </h2>

                <ChevronDown
                  size={15}
                  className={`text-slate-500 transition-transform lg:hidden ${
                    filtersOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("");
                  setMaxPrice(5000);
                  setSort("newest");
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Reset All
              </button>
            </div>

            <div
              id="marketplace-filters"
              className={filtersOpen ? "" : "hidden lg:block"}
            >
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Category
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="radio"
                      name="marketplace-category"
                      checked={selectedCategory === ""}
                      onChange={() => setSelectedCategory("")}
                    />
                    All Categories
                  </label>

                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 text-xs text-slate-600"
                    >
                      <input
                        type="radio"
                        name="marketplace-category"
                        checked={selectedCategory === category.slug}
                        onChange={() =>
                          setSelectedCategory(category.slug)
                        }
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Max Price
                </p>

                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={maxPrice}
                  onChange={(event) =>
                    setMaxPrice(Number(event.target.value))
                  }
                  className="w-full"
                />

                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>Rs.0</span>
                  <span>
                    Rs.{maxPrice}
                    {maxPrice === 5000 ? "+" : ""}
                  </span>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Sort By
                </p>

                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
                >
                  <option value="newest">Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Best Rating</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Product grid and pagination */}
          <div>
            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <p className="text-sm text-red-700">{error}</p>

                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  disabled={loading}
                  className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Try Again
                </button>
              </div>
            )}

            {loading && (
              <p
                role="status"
                className="mb-4 text-sm text-slate-500"
              >
                {products.length > 0
                  ? "Updating products..."
                  : "Loading products..."}
              </p>
            )}

            {products.length === 0 ? (
              loading || error ? null : (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  No products match your filters.
                </div>
              )
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) => Math.max(1, p - 1))
                      }
                      disabled={
                        loading || pagination.currentPage === 1
                      }
                      aria-label="Previous page"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={15} />
                    </button>

                    {getPageNumbers(
                      pagination.currentPage,
                      pagination.totalPages
                    ).map((pageNumber, index) =>
                      pageNumber === "..." ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-1.5 text-xs text-slate-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          type="button"
                          key={pageNumber}
                          onClick={() => setPage(pageNumber)}
                          disabled={loading}
                          aria-current={
                            pageNumber === pagination.currentPage
                              ? "page"
                              : undefined
                          }
                          className={`h-8 w-8 rounded-md text-xs font-semibold transition ${
                            pageNumber === pagination.currentPage
                              ? "bg-blue-600 text-white"
                              : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {pageNumber}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setPage((p) =>
                          Math.min(pagination.totalPages, p + 1)
                        )
                      }
                      disabled={
                        loading ||
                        pagination.currentPage === pagination.totalPages
                      }
                      aria-label="Next page"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
