"use client";

import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";

type Review = {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  product: { id: string; name: string };
};

type PaginationInfo = { currentPage: number; totalPages: number; totalCount: number };

export default function ContentManagementPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    loadReviews();
  }, [page]);

  async function loadReviews() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setReviews(data.reviews);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Load reviews error:", error);
    } finally {
      setLoading(false);
    }
  }

  // Search is applied client-side to the current page's reviews only
  // as a quick filter; for a fully accurate cross-page search, this
  // would need the same server-side treatment as Entrepreneurs/Products.
  const filteredReviews = reviews.filter((review) => {
    const term = searchTerm.trim().toLowerCase();
    if (term === "") return true;
    return (
      review.reviewerName.toLowerCase().includes(term) ||
      review.product.name.toLowerCase().includes(term) ||
      review.comment.toLowerCase().includes(term)
    );
  });

  async function handleRemove(review: Review) {
    const confirmed = window.confirm(`Remove this review by ${review.reviewerName}? This cannot be undone.`);
    if (!confirmed) return;

    setRemovingId(review.id);
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        alert(data.message || "Unable to remove this review.");
        return;
      }
      loadReviews();
    } catch (error) {
      console.error("Remove review error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setRemovingId(null);
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
              <p className="p-8 text-sm text-slate-500">No reviews match your search on this page.</p>
            ) : (
              <table className="w-full text-left">
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
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </td>
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

          {pagination && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </main>
      </div>
    </div>
  );
}
