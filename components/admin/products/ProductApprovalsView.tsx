"use client";

import { useState } from "react";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import Pagination from "@/components/admin/Pagination";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import ProductThumbnail from "@/components/admin/products/ProductThumbnail";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import { formatDate } from "@/lib/format-date";
import type { ProductList } from "@/lib/admin/products";

export type ProductApprovalTab = "ALL" | "PENDING" | "APPROVED";

const tabs: { key: ProductApprovalTab; label: string }[] = [
  { key: "ALL", label: "All Listings" },
  { key: "PENDING", label: "Awaiting Approval" },
  { key: "APPROVED", label: "Approved" },
];

// The interactive part of Product Approval. The submissions arrive already
// loaded from the server (app/admin/products/approvals/page.tsx); changing
// tab or page updates the URL, which asks the server for that data.
export default function ProductApprovalsView({ status, data }: { status: ProductApprovalTab; data: ProductList }) {
  const { products, pagination } = data;
  const { isPending, setQuery, refresh } = useQueryNavigation();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Approve/Reject happen right from this table (moderators shouldn't need
  // to open every product just to approve it); "Preview" goes to the full
  // Product Submission Audit page.
  async function handleQuickAction(productId: string, action: "approve" | "reject") {
    setActionLoadingId(productId);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}/${action}`, { method: "PATCH" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.message || `Unable to ${action} this product.`);
      }
      // Re-render from the database, so the queue shows the saved state.
      refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Product Submission Approvals" notificationsHref="/admin/notifications" />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setQuery({ status: tab.key === "PENDING" ? null : tab.key, page: null })}
                aria-current={status === tab.key ? "page" : undefined}
                className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                  status === tab.key
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <p className="mb-3 text-xs text-slate-600" aria-live="polite">
            {isPending ? "Updating..." : `Showing ${products.length} of ${pagination.totalCount}`}
          </p>

          <div
            className={`overflow-x-auto rounded-xl border border-slate-200 bg-white transition-opacity ${
              isPending ? "opacity-50" : ""
            }`}
            aria-busy={isPending}
          >
            {products.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">
                {status === "PENDING"
                  ? "No products are waiting for review. New submissions will appear here."
                  : "No products in this category."}
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Preview</th>
                    <th className="px-5 py-3">Venture Item Name</th>
                    <th className="px-5 py-3">Seller Hub</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Submit Date</th>
                    <th className="px-5 py-3">Moderator Decisions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-3">
                        <ProductThumbnail url={product.imageUrl} name={product.name} size={48} />
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{product.name}</td>
                      <td className="px-5 py-3">
                        {product.entrepreneurName}
                        {product.university && ` (${product.university})`}
                      </td>
                      <td className="px-5 py-3 font-semibold text-blue-600">Rs.{product.price.toFixed(2)}</td>
                      <td className="px-5 py-3">{product.category}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(product.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Preview
                          </Link>
                          {product.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleQuickAction(product.id, "reject")}
                                disabled={actionLoadingId === product.id || isPending}
                                className="rounded-md bg-red-500 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleQuickAction(product.id, "approve")}
                                disabled={actionLoadingId === product.id || isPending}
                                className="rounded-md bg-emerald-500 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                              >
                                Approve
                              </button>
                            </>
                          )}
                        </div>
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
