"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Hand, Cpu, Coffee, Scissors, Shirt, Palette, type LucideIcon } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  productCount: number;
};

const categoryIcons: Record<string, LucideIcon> = {
  hand: Hand,
  cpu: Cpu,
  coffee: Coffee,
  scissors: Scissors,
  shirt: Shirt,
  palette: Palette,
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => setCategories(data.categories || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
        <p className="mt-2 text-sm text-slate-500">
          Browse student products and services by category.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading categories...</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3">
            {categories.map((category) => {
              const Icon = (category.icon && categoryIcons[category.icon]) || Hand;
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="rounded-xl border border-slate-200 bg-white p-6 text-center transition hover:border-blue-300 hover:shadow-sm"
                >
                  <Icon size={26} className="mx-auto text-blue-600" />
                  <p className="mt-3 text-sm font-bold text-slate-800">{category.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{category.productCount} Products</p>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
