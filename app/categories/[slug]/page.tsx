"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ProductCard, { type ProductCardData } from "@/components/public/ProductCard";

type Category = { id: string; name: string; slug: string; productCount: number };

export default function CategoryDetailsPage() {
  const params = useParams<{ slug: string }>();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategoryAndProducts() {
      try {
        const [categoriesResponse, productsResponse] = await Promise.all([
          fetch("/api/categories"),
          fetch(`/api/marketplace/products?category=${params.slug}`),
        ]);
        const categoriesData = await categoriesResponse.json();
        const productsData = await productsResponse.json();

        const matchedCategory = categoriesData.categories?.find(
          (c: Category) => c.slug === params.slug
        );

        setCategory(matchedCategory || null);
        if (productsResponse.ok) setProducts(productsData.products);
      } catch (error) {
        console.error("Load category details error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCategoryAndProducts();
  }, [params.slug]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="mb-4 text-xs text-slate-500">
          <Link href="/categories" className="hover:underline">Categories</Link> {">"} {category?.name || "..."}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">{category?.name || "Category"}</h1>
        <p className="mt-1 text-sm text-slate-500">{products.length} products in this category</p>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No approved products in this category yet.
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



