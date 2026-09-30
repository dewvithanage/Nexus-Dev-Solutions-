"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

type Review = {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ReviewSummary = {
  totalReviews: number;
  averageRating: number;
  breakdown: Record<string, number>;
};

export default function ProductReviewsPage() {
  const params = useParams<{ productId: string }>();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const response = await fetch(`/api/reviews/product/${params.productId}`);
        const data = await response.json();

        if (response.ok) {
          setReviews(data.reviews);
          setSummary(data.summary);
        }
      } catch (error) {
        console.error("Load reviews error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, [params.productId]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-2 text-xs text-slate-500">
          <Link href="/marketplace" className="hover:underline">Marketplace</Link> {">"} Reviews
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Customer Reviews</h1>
          <Link
            href={`/products/${params.productId}/review`}
            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Write a Review
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading reviews...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            {/* Rating summary card */}
            <div className="h-fit rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-4xl font-bold text-slate-900">{summary?.averageRating ?? 0}</p>
              <div className="mt-2 flex justify-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    className={
                      star <= Math.round(summary?.averageRating ?? 0)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">{summary?.totalReviews ?? 0} Reviews</p>

              <div className="mt-4 space-y-1.5 text-left">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary?.breakdown[star] ?? 0;
                  const total = summary?.totalReviews || 1;
                  const percent = (count / total) * 100;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="w-10">{star} stars</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="w-4 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review list */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                  No reviews yet — be the first to review this product.
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
