"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import ProductCard, { type ProductCardData } from "@/components/public/ProductCard";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type BusinessStorefront = {
  id: string;
  businessName: string;
  description: string | null;
  logoUrl: string | null;
  entrepreneurName: string;
  university: string | null;
  bio: string | null;
  whatsappNumber: string;
};

export default function EntrepreneurProfilePage() {
  const params = useParams<{ businessId: string }>();

  const [business, setBusiness] = useState<BusinessStorefront | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBusiness() {
      try {
        const response = await fetch(`/api/businesses/${params.businessId}`);
        const data = await response.json();
        if (response.ok) {
          setBusiness(data.business);
          setProducts(
            data.products.map((product: ProductCardData) => ({
              ...product,
              businessName: data.business.businessName,
            }))
          );
        }
      } catch (error) {
        console.error("Load business error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadBusiness();
  }, [params.businessId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 p-10 text-center text-sm text-slate-500">Loading...</main>
        <Footer />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 p-10 text-center text-sm text-red-500">Business not found.</main>
        <Footer />
      </div>
    );
  }

  const whatsAppMessage = `Hi ${business.entrepreneurName}, I found your shop "${business.businessName}" on StartupSpark and I'd like to know more.`;

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="flex-1">
        <div className="h-48 w-full bg-gradient-to-r from-blue-100 to-slate-100" />

        <div className="mx-auto max-w-6xl px-6">
          <div className="-mt-12 flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 text-2xl font-bold text-slate-500">
                {business.logoUrl ? (
                  <img src={business.logoUrl} alt={business.businessName} className="h-full w-full object-cover" />
                ) : (
                  business.entrepreneurName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{business.entrepreneurName}</h1>
                  {business.university && (
                    <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {business.university}
                    </span>
                  )}
                </div>
                <p className="mt-1 max-w-md text-sm text-slate-500">{business.bio}</p>
              </div>
            </div>

            <a
              href={buildWhatsAppLink(business.whatsappNumber, whatsAppMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 whitespace-nowrap rounded-md bg-green-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-600"
            >
              <MessageCircle size={16} />
              Chat via WhatsApp
            </a>
          </div>

          <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-[280px_1fr]">
            <div className="h-fit rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-900">About My Business</h2>
              <p className="mt-3 text-sm italic leading-6 text-slate-600">
                {business.description ? `"${business.description}"` : "No description yet."}
              </p>
            </div>

            <div>
              <h2 className="mb-4 text-sm font-bold text-slate-900">My Campus Storefront</h2>
              {products.length === 0 ? (
                <p className="text-sm text-slate-500">No approved products yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
