"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type Review = {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  product: { name: string };
};

// The Figma's "Content Management" table actually reused the Rankings
// page's columns by mistake (entrepreneur name, faculty, etc.) — the
// page's own heading and the "Review Details" panel below it make clear
// the real intent is moderating customer reviews, so that's what this
// builds: a review list with a details view and a Remove action.
export default function ContentManagementPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // FIX: header search box was previously decorative. Filters by
  // reviewer name, the product being reviewed, or the comment text.
  const filteredReviews = reviews.filter((review) => {
    const term = searchTerm.trim().toLowerCase();
    if (term === "") return true;
    return (
      review.reviewerName.toLowerCase().includes(term) ||
      review.product.name.toLowerCase().includes(term) ||
      review.comment.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      const response = await fetch("/api/admin/reviews");
      const data = await response.json();
      if (response.ok) setReviews(data.reviews);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(reviewId: string) {
    if (!confirm("Remove this review? This can't be undone.")) return;

    const response = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
    if (response.ok) {
      setReviews((previous) => previous.filter((review) => review.id !== reviewId));
      setSelectedReview(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Content Management"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search reviewer, product..."
        />

        <main className="p-8">
          <h1 className="mb-1 text-lg font-bold text-slate-900">
            Manage customer reviews and inappropriate content
          </h1>
          <p className="mb-5 text-xs text-slate-500">
            Reviews are submitted by guest customers (no account needed) — remove anything
            inappropriate or spammy.
          </p>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No reviews submitted yet.</p>
            ) : filteredReviews.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No reviews match your search.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Reviewer</th>
                    <th className="px-5 py-3">Rating</th>
                    <th className="px-5 py-3">Comment</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviews.map((review) => (
                    <tr key={review.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-4 font-medium text-slate-800">{review.product.name}</td>
                      <td className="px-5 py-4">{review.reviewerName}</td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1">
                          <Star size={12} className="fill-amber-400 text-amber-400" /> {review.rating}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-4">{review.comment}</td>
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedReview(review)}
                            className="rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-600"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleRemove(review.id)}
                            className="rounded-md bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedReview && (
            <div className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="mb-3 text-sm font-bold text-slate-900">Review Details</h2>
              <p className="text-sm text-slate-700"><b>Product:</b> {selectedReview.product.name}</p>
              <p className="text-sm text-slate-700"><b>Customer:</b> {selectedReview.reviewerName}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-700">
                <b>Rating:</b>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    className={i < selectedReview.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                  />
                ))}
              </p>
              <p className="mt-3 text-sm italic text-slate-600">&ldquo;{selectedReview.comment}&rdquo;</p>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setSelectedReview(null)}
                  className="rounded-md border border-slate-300 px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                >
                  Close
                </button>
                <button
                  onClick={() => handleRemove(selectedReview.id)}
                  className="rounded-md bg-red-500 px-5 py-2 text-xs font-semibold text-white hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
