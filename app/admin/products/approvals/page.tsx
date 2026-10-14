"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import Pagination from "@/components/admin/Pagination";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  category: string;
  imageUrl: string | null;
  entrepreneurName: string;
  university: string | null;
  createdAt: string;
};

type TabKey = "ALL" | "PENDING" | "APPROVED";

const tabs: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All Listings" },
  { key: "PENDING", label: "Awaiting Approval" },
  { key: "APPROVED", label: "Approved" },
];

export default function ProductApprovalPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("PENDING");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page]);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      // "ALL" sends no status filter, so the API returns every listing that
      // isn't rejected.
      const params = new URLSearchParams({ page: String(page) });
      if (activeTab !== "ALL") params.set("status", activeTab);
      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Unable to load submissions.");
        return;
      }
      setProducts(data.products);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Load products error:", error);
      setError("Something went wrong loading submissions.");
    } finally {
      setLoading(false);
    }
  }

  // Approve/Reject happen right from this table (matching the Figma —
  // moderators shouldn't need to open every product just to approve it),
  // but "Preview" still goes to the full Product Submission Audit page.
  async function handleQuickAction(productId: string, action: "approve" | "reject") {
    setActionLoadingId(productId);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}/${action}`, {
        method: "PATCH",
      });
      if (response.ok) {
        setProducts((previous) => previous.filter((p) => p.id !== productId));
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.message || `Unable to ${action} this product.`);
      }
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
          <div className="mb-5 flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading submissions...</p>
            ) : products.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No products in this category.</p>
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
                        <div className="h-12 w-12 overflow-hidden rounded-md bg-slate-100">
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{product.name}</td>
                      <td className="px-5 py-3">
                        {product.entrepreneurName}
                        {product.university && ` (${product.university})`}
                      </td>
                      <td className="px-5 py-3 font-semibold text-blue-600">
                        Rs.{Number(product.price).toFixed(2)}
                      </td>
                      <td className="px-5 py-3">{product.category}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
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
                                disabled={actionLoadingId === product.id}
                                className="rounded-md bg-red-500 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleQuickAction(product.id, "approve")}
                                disabled={actionLoadingId === product.id}
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

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </main>
      </div>
    </div>
  );
}
