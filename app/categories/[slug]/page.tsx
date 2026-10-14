
import Link from "next/link";
import { notFound } from "next/navigation";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ProductCard, {
  type ProductCardData,
} from "@/components/public/ProductCard";
import { getCategoryWithProducts } from "@/lib/public-queries";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryDetailsPage({ params }: Props) {
  const { slug } = await params;
  const result = await getCategoryWithProducts(slug);

  if (!result) {
    notFound();
  }

  const { category, products } = result;

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="mb-4 text-xs text-slate-500">
          <Link href="/categories" className="hover:underline">
            Categories
          </Link>{" "}
          {">"} {category.name}
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          {category.name}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {products.length} products in this category
        </p>

        {products.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No approved products in this category yet.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
            {products.map((product: ProductCardData) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
