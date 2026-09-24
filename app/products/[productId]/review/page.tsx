"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

type ProductSummary = {
  id: string;
  name: string;
  business: { businessName: string };
};

export default function ReviewFormPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/${params.productId}`);
        const data = await response.json();
        if (response.ok) setProduct(data.product);
      } catch (error) {
        console.error("Load product error:", error);
      }
    }

    loadProduct();
  }, [params.productId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!reviewerName || rating === 0 || !comment) {
      setError("Please select a rating of at least 1 star.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: params.productId, reviewerName, rating, comment }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to submit review.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/products/${params.productId}/reviews`), 1500);
    } catch (error) {
      console.error("Submit review error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <div className="mb-4 text-xs text-slate-500">
          <Link href="/marketplace" className="hover:underline">Marketplace</Link>
          {product && <> {">"} {product.business.businessName}</>} {">"} Write a Review
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Leave A Product Review</h1>
          <p className="mt-1 text-sm text-slate-500">No account required to submit your public campus review</p>

          {product && (
            <div className="mt-5 flex items-center gap-3 rounded-md bg-slate-50 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                <p className="text-xs text-slate-500">By {product.business.businessName}</p>
              </div>
            </div>
          )}

          {success ? (
            <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Your review has been submitted successfully! Thank you for your feedback.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(event) => setReviewerName(event.target.value)}
                  placeholder="Enter your full name (e.g. Sithu De Silva)"
<<<<<<< HEAD
                 className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
=======
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
>>>>>>> origin/Dev
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setRating(star)}>
                      <Star
                        size={24}
                        className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                      />
                    </button>
                  ))}
                  {rating > 0 && <span className="ml-2 text-xs text-slate-500">{rating} out of 5 stars</span>}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Your Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Share your genuine experience with this product..."
                  className="h-28 w-full resize-none rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? "Submitting..." : "Submit Review"}
                </button>
                <Link
                  href={`/products/${params.productId}/reviews`}
                  className="rounded-md border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
