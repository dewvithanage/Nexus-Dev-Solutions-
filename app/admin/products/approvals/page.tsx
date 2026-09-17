"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
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

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function loadProducts() {
    setLoading(true);
    try {
      const query = activeTab === "ALL" ? "" : `?status=${activeTab}`;
      const response = await fetch(`/api/admin/products${query}`);
      const data = await response.json();
      if (response.ok) setProducts(data.products);
    } catch (error) {
      console.error("Load products error:", error);
    } finally {
      setLoading(false);
    }
  }

  // Approve/Reject happen right from this table (matching the Figma —
  // moderators shouldn't need to open every product just to approve it),
  // but "Preview" still goes to the full Product Submission Audit page.
  async function handleQuickAction(productId: string, action: "approve" | "reject") {
    setActionLoadingId(productId);
    try {
      const response = await fetch(`/api/admin/products/${productId}/${action}`, {
        method: "PATCH",
      });
      if (response.ok) {
        setProducts((previous) => previous.filter((p) => p.id !== productId));
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Product Submission Approvals" />

        <main className="p-8">
          <div className="mb-5 flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading submissions...</p>
            ) : products.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No products in this category.</p>
            ) : (
              <table className="w-full text-left">
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
        </main>
      </div>
    </div>
  );
}
