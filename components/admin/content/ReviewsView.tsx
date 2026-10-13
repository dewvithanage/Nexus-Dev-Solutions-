"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import { formatDate } from "@/lib/format-date";
import type { ReviewsList } from "@/lib/admin/content";

type Review = ReviewsList["reviews"][number];

// The interactive part of Content Management. Reviews arrive already loaded
// from the server; after a removal the page is re-rendered on the server.
export default function ReviewsView({ data }: { data: ReviewsList }) {
  const { reviews, pagination } = data;
  const { isPending, setQuery, refresh } = useQueryNavigation();
  const [searchTerm, setSearchTerm] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Search is applied to the current page's reviews only, as a quick
  // filter; a cross-page search would need to go to the server.
  const term = searchTerm.trim().toLowerCase();
  const filteredReviews = reviews.filter(
    (review) =>
      term === "" ||
      review.reviewerName.toLowerCase().includes(term) ||
      review.product.name.toLowerCase().includes(term) ||
      review.comment.toLowerCase().includes(term)
  );

  async function handleRemove(review: Review) {
    const confirmed = window.confirm(`Remove this review by ${review.reviewerName}? This cannot be undone.`);
    if (!confirmed) return;

    setError("");
    setRemovingId(review.id);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setError(result.message || "Unable to remove this review.");
      }
      // Refresh either way: on a 404 it was already removed elsewhere.
      refresh();
    } catch (error) {
      console.error("Remove review error:", error);
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Content Management"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search reviewer, product..."
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <h1 className="mb-1 text-lg font-bold text-slate-900">Manage customer reviews and inappropriate content</h1>
          <p className="mb-5 text-xs text-slate-500">
            Reviews are submitted by guest customers (no account needed) — remove anything inappropriate or spammy.
          </p>
          {error && (
            <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div
            className={`overflow-x-auto rounded-xl border border-slate-200 bg-white transition-opacity ${
              isPending ? "opacity-50" : ""
            }`}
            aria-busy={isPending}
          >
            {reviews.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No reviews submitted yet.</p>
            ) : filteredReviews.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No reviews match your search on this page.</p>
            ) : (
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Reviewer</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Rating</th>
                    <th className="px-5 py-3">Comment</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviews.map((review) => (
                    <tr key={review.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-3 font-semibold text-slate-800">{review.reviewerName}</td>
                      <td className="px-5 py-3">{review.product.name}</td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          {review.rating}
                        </span>
                      </td>
                      <td className="max-w-xs px-5 py-3">{review.comment}</td>
                      <td className="px-5 py-3 text-slate-400">{formatDate(review.createdAt)}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleRemove(review)}
                          disabled={removingId === review.id}
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {removingId === review.id ? "Removing..." : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setQuery({ page })}
          />
        </main>
      </div>
    </div>
  );
}
