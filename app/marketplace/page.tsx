"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ProductCard, { type ProductCardData } from "@/components/public/ProductCard";

type Category = { id: string; name: string; slug: string };

type Pagination = { currentPage: number; totalPages: number; totalCount: number; pageSize: number };

export default function MarketplacePage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState(5000);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => setCategories(data.categories || []));
  }, []);

  // Whenever a filter changes, go back to page 1 — staying on, say,
  // page 3 after changing the category could land on an empty page
  // that doesn't exist for the new filter.
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, maxPrice, sort]);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.set("category", selectedCategory);
        if (maxPrice < 5000) params.set("maxPrice", String(maxPrice));
        params.set("sort", sort);
        params.set("page", String(page));

        const response = await fetch(`/api/marketplace/products?${params.toString()}`);
        const data = await response.json();
        if (response.ok) {
          setProducts(data.products);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Load marketplace products error:", error);
      } finally {
        setLoading(false);
        // Scroll back to the top of the results when the page changes,
        // so the person isn't left scrolled halfway down an empty area.
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    loadProducts();
  }, [selectedCategory, maxPrice, sort, page]);

  // Builds a compact page number list like [1, 2, 3, "...", 8] instead
  // of showing every single page number when there are many pages.
  function getPageNumbers(current: number, total: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push("...");
    pages.push(total);

    return pages;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <p className="mb-5 text-sm text-slate-500">
          {pagination ? `Showing ${products.length} of ${pagination.totalCount} products` : "Loading..."}
        </p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
          {/* Filters sidebar */}
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Filters</h2>
              <button
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

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-700">Category</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="radio"
                    checked={selectedCategory === ""}
                    onChange={() => setSelectedCategory("")}
                  />
                  All Categories
                </label>
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="radio"
                      checked={selectedCategory === category.slug}
                      onChange={() => setSelectedCategory(category.slug)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-700">Max Price</p>
              <input
                type="range"
                min={100}
                max={5000}
                step={100}
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Rs.0</span>
                <span>Rs.{maxPrice}{maxPrice === 5000 ? "+" : ""}</span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-semibold text-slate-700">Sort By</p>
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
          </aside>

          {/* Product grid + pagination */}
          <div>
            {loading ? (
              <p className="text-sm text-slate-500">Loading products...</p>
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                No products match your filters.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.currentPage === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={15} />
                    </button>

                    {getPageNumbers(pagination.currentPage, pagination.totalPages).map((pageNumber, index) =>
                      pageNumber === "..." ? (
                        <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-slate-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={pageNumber}
                          onClick={() => setPage(pageNumber)}
                          className={`h-8 w-8 rounded-md text-xs font-semibold transition ${
                            pageNumber === pagination.currentPage
                              ? "bg-blue-600 text-white"
                              : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.currentPage === pagination.totalPages}
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
