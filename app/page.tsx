"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Hand,
  Cpu,
  Coffee,
  Scissors,
  Shirt,
  Palette,
  type LucideIcon,
} from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ProductCard, { type ProductCardData } from "@/components/public/ProductCard";

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  productCount: number;
};

// Maps the icon name stored in the database (set by prisma/seed.ts) to an
// actual icon component. Falls back to a generic icon if it's ever a name
// this map doesn't recognize, rather than crashing the page.
const categoryIcons: Record<string, LucideIcon> = {
  hand: Hand,
  cpu: Cpu,
  coffee: Coffee,
  scissors: Scissors,
  shirt: Shirt,
  palette: Palette,
};

// Small helper: fetch, but if it fails (slow/dropped connection), wait a
// moment and try one more time before giving up. This is what stops a
// single network hiccup from leaving the page looking permanently empty.
async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<ProductCardData[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [hadError, setHadError] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const categoriesResponse = await fetchWithRetry("/api/categories");
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories);
      } catch (error) {
        console.error("Load categories error:", error);
        setHadError(true);
      } finally {
        setLoadingCategories(false);
      }

      try {
        const productsResponse = await fetchWithRetry("/api/marketplace/products?featured=true");
        const productsData = await productsResponse.json();
        setTrendingProducts(productsData.products);
      } catch (error) {
        console.error("Load trending products error:", error);
        setHadError(true);
      } finally {
        setLoadingTrending(false);
      }
    }

    loadHomeData();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* Hero — full-bleed background photo (Ken Burns zoom) with a
            dark gradient overlay so the white text stays readable on
            top of it, replacing the earlier two-column text/photo layout. */}
        <section className="relative isolate flex h-[520px] items-center overflow-hidden">
          <img
            src="/images/home-hero.png"
            alt="Startup Spark — student entrepreneurs"
            className="animate-kenburns absolute inset-0 h-full w-full object-cover"
          />
          {/* Dark gradient overlay — darkest on the left where the text
              sits, fading out toward the right so the photo still shows
              through. Without this, white text would be unreadable
              against a bright photo. */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />

          <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
            <div className="animate-fade-in-up max-w-xl">
              <h1 className="text-4xl font-bold leading-tight text-white drop-shadow-sm">
                Discover Student-Made Products &amp; Services
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-100">
                A specialized marketplace showcasing handcrafted merchandise, innovative
                digital tools, custom bakes, and professional services engineered
                entirely by university entrepreneurs.
              </p>
              <div className="mt-6 flex gap-3">
                <Link
                  href="/marketplace"
                  className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-blue-700"
                >
                  Browse Marketplace
                </Link>
                <Link
                  href="/about"
                  className="rounded-md border border-white/70 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:scale-105 hover:bg-white/20"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Categories */}
        <section className="bg-slate-50 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-xl font-bold text-slate-900">Featured Categories</h2>
            <p className="mt-1 text-sm text-slate-500">
              Explore the diverse range of creative items built around campus schedules.
            </p>

            {loadingCategories ? (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[104px] animate-pulse rounded-xl border border-slate-200 bg-slate-100"
                  />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                {hadError
                  ? "Couldn't load categories — check your connection and refresh the page."
                  : "No categories yet."}
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                {categories.map((category) => {
                  const Icon = (category.icon && categoryIcons[category.icon]) || Hand;
                  return (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      className="rounded-xl border border-slate-200 bg-white p-5 text-center transition hover:border-blue-300 hover:shadow-sm"
                    >
                      <Icon size={22} className="mx-auto text-blue-600" />
                      <p className="mt-3 text-sm font-semibold text-slate-800">{category.name}</p>
                      <p className="mt-1 text-xs text-slate-400">{category.productCount} Products</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Trending Innovations */}
        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Trending Innovations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Check out the most loved, top-rated products published this week.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="rounded-md border border-blue-600 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
              View All Products
            </Link>
          </div>

          {loadingTrending ? (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-square w-full rounded-xl bg-slate-100" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-full rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : trendingProducts.length === 0 ? (
            <p className="text-sm text-slate-500">
              {hadError
                ? "Couldn't load trending products — check your connection and refresh the page."
                : "No trending products yet — check back once more products are approved and reviewed."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {trendingProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* How It Works */}
        <section className="bg-slate-50 py-14 text-center">
          <h2 className="text-xl font-bold text-slate-900">How It Works</h2>
          <p className="mt-1 text-sm text-slate-500">
            Zero friction on-campus commerce. Support talent in 4 simple steps.
          </p>

          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-5 px-6 text-left md:grid-cols-4">
            {[
              { step: 1, title: "Browse Marketplace", text: "Discover products or student services tailored directly to your local academic community." },
              { step: 2, title: "Select & Customize", text: "Choose specific sizing, colors, or project deliverables straight from the listing details." },
              { step: 3, title: "WhatsApp Confirm", text: "Get connected with the student entrepreneur immediately via WhatsApp to agree on payment & pickup." },
              { step: 4, title: "Receive & Review", text: "Pick up your item directly on-campus or get the digital download link. Leave stars to boost them!" },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
