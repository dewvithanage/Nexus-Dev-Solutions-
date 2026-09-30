"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ProductCard, { type ProductCardData } from "@/components/public/ProductCard";

// Wrapped in Suspense because useSearchParams() requires it in the App
// Router — same reason the Reset Password page needed this.
export default function SearchResultsPage() {
  return (
    <Suspense fallback={null}>
      <SearchResultsContent />
    </Suspense>
  );
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      setLoading(true);
      try {
        const response = await fetch(`/api/marketplace/products?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok) setProducts(data.products);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }

    if (query) {
      loadResults();
    } else {
      setLoading(false);
      setProducts([]);
    }
  }, [query]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <h1 className="text-xl font-bold text-slate-900">
          Search Results for &ldquo;{query}&rdquo;
        </h1>
        <p className="mt-1 text-sm text-slate-500">{products.length} products found</p>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-slate-500">Searching...</p>
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


