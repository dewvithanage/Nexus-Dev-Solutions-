"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star, MessageCircle } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { useCart } from "@/lib/cart-context";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type ProductDetails = {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  onCampusPickup: boolean;
  areaDropOff: boolean;
  postingEnabled: boolean;
  averageRating: number | null;
  reviewCount: number;
  category: { name: string; slug: string };
  images: { id: string; url: string }[];
  business: {
    id: string;
    businessName: string;
    entrepreneurProfile: {
      whatsappNumber: string;
      university: string | null;
      user: { name: string };
    };
  };
};

export default function ProductDetailsPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/${params.productId}`);
        const data = await response.json();
        if (response.ok) setProduct(data.product);
      } catch (error) {
        console.error("Load product error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [params.productId]);

  function handleAddToCart() {
    if (!product) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        imageUrl: product.images[0]?.url ?? null,
        businessId: product.business.id,
        businessName: product.business.businessName,
      },
      quantity
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }

  function handleBuyNow() {
    if (!product) return;
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        imageUrl: product.images[0]?.url ?? null,
        businessId: product.business.id,
        businessName: product.business.businessName,
      },
      quantity
    );
    router.push(`/checkout/${product.business.id}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 p-10 text-center text-sm text-slate-500">Loading product...</main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 p-10 text-center text-sm text-red-500">Product not found.</main>
        <Footer />
      </div>
    );
  }

  const fulfillmentOptions = [
    product.onCampusPickup && "On-campus pickup",
    product.areaDropOff && "Area drop-off",
    product.postingEnabled && "Posting",
  ].filter(Boolean);

  const whatsAppInquiryMessage = `Hi ${product.business.entrepreneurProfile.user.name}, I'm interested in "${product.name}" (Rs.${Number(product.price).toFixed(2)}) on StartupSpark. Is it available?`;

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-4 text-xs text-slate-500">
          <Link href="/marketplace" className="hover:underline">Marketplace</Link> {">"}{" "}
          <Link href={`/categories/${product.category.slug}`} className="hover:underline">
            {product.category.name}
          </Link>{" "}
          {">"} {product.name}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="aspect-square overflow-hidden rounded-xl bg-white">
              {product.images[selectedImageIndex] && (
                <img
                  src={product.images[selectedImageIndex].url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`h-16 w-16 overflow-hidden rounded-md border-2 ${
                      index === selectedImageIndex ? "border-blue-600" : "border-transparent"
                    }`}
                  >
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p className="text-xs font-medium text-blue-600">
              {product.business.entrepreneurProfile.university}
            </p>

            {product.averageRating !== null && (
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                {product.averageRating} ({product.reviewCount} reviews)
              </div>
            )}

            <h1 className="mt-2 text-2xl font-bold text-slate-900">{product.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Created by <span className="font-medium text-slate-700">{product.business.businessName}</span>
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-blue-600">Rs.{Number(product.price).toFixed(2)}</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500">Quantity:</span>
                <div className="flex items-center rounded-md border border-slate-300">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-1">-</button>
                  <span className="px-3">{quantity}</span>
                  <button onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))} className="px-3 py-1">+</button>
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">{product.description}</p>

            <div className="mt-6 space-y-2.5">
              <button
                onClick={handleBuyNow}
                className="w-full rounded-md bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600"
              >
                Buy Now
              </button>
              <button
                onClick={handleAddToCart}
                className="w-full rounded-md bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                {addedToCart ? "Added!" : "Add To Cart"}
              </button>
              <a
                href={buildWhatsAppLink(product.business.entrepreneurProfile.whatsappNumber, whatsAppInquiryMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600"
              >
                <MessageCircle size={16} />
                Contact via WhatsApp
              </a>
            </div>

            {fulfillmentOptions.length > 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-700">Specifications</p>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>Fulfillment</span>
                  <span className="font-medium text-slate-800">{fulfillmentOptions.join(", ")}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews preview */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Reviews & Ratings ({product.reviewCount})
            </h2>
            <div className="flex gap-2">
              <Link
                href={`/products/${product.id}/reviews`}
                className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                See Full Reviews
              </Link>
              <Link
                href={`/products/${product.id}/review`}
                className="rounded-md border border-blue-600 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
              >
                Write a Review
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
