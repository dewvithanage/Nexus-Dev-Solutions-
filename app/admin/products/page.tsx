"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";

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
  averageRating: number | null;
  salesCount: number;
  createdAt: string;
};

type TabKey = "ACTIVE" | "REJECTED";

export default function ProductManagementPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/products");
      const data = await response.json();
      if (response.ok) setProducts(data.products);
    } catch (error) {
      console.error("Load products error:", error);
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(
    () => ["All", ...new Set(products.map((p) => p.category))],
    [products]
  );

  // FIX: rejected products previously sat in the same list as everything
  // else, distinguished only by a small status badge — easy to miss and
  // cluttering the main working view. Now split into two tabs: "Active
  // Listings" (pending + approved) and "Rejected", matching the same
  // tab pattern already used on Sales Verification.
  const rejectedCount = products.filter((p) => p.status === "REJECTED").length;

  const filtered = products.filter((product) => {
    const matchesTab = activeTab === "REJECTED" ? product.status === "REJECTED" : product.status !== "REJECTED";
    const matchesCategory = categoryFilter === "All" || product.category === categoryFilter;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === "" ||
      product.name.toLowerCase().includes(term) ||
      product.entrepreneurName.toLowerCase().includes(term);
    return matchesTab && matchesCategory && matchesSearch;
  });

  // NEW: permanently delete a product. The backend blocks this and
  // returns a clear reason if the product has real order history, so
  // that error message is shown as-is rather than a generic failure.
  async function handleDelete(product: ProductRow) {
    const confirmed = window.confirm(
      `Permanently delete "${product.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to delete this product.");
        return;
      }

      setProducts((current) => current.filter((p) => p.id !== product.id));
    } catch (error) {
      console.error("Delete product error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Master Venture Directory"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search product or entrepreneur..."
        />

        <main className="p-8">
          {/* Tabs: Active Listings vs Rejected */}
          <div className="mb-5 flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-2.5 text-xs font-semibold ${
                activeTab === "ACTIVE"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Active Listings
            </button>
            <button
              onClick={() => setActiveTab("REJECTED")}
              className={`px-4 py-2.5 text-xs font-semibold ${
                activeTab === "REJECTED"
                  ? "border-b-2 border-red-600 text-red-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  Category: {category}
                </option>
              ))}
            </select>

            <Link
              href="/admin/products/approvals"
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Products to be accepted
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading products...</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">
                {activeTab === "REJECTED" ? "No rejected products." : "No products match your filters."}
              </p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Preview</th>
                    <th className="px-5 py-3">Venture Item Name</th>
                    <th className="px-5 py-3">Entrepreneur / Hub</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Sales Count</th>
                    <th className="px-5 py-3">Rating</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Listed Date</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((product) => (
                    <tr key={product.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-3">
                        <div className="h-11 w-11 overflow-hidden rounded-md bg-slate-100">
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-semibold text-slate-800 hover:text-blue-600"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        {product.entrepreneurName}
                        {product.university && ` (${product.university})`}
                      </td>
                      <td className="px-5 py-3">{product.category}</td>
                      <td className="px-5 py-3 font-semibold text-blue-600">
                        Rs.{Number(product.price).toFixed(2)}
                      </td>
                      <td className="px-5 py-3">{product.salesCount}</td>
                      <td className="px-5 py-3">
                        {product.averageRating ? (
                          <span className="flex items-center gap-1">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            {product.averageRating}
                          </span>
                        ) : (
                          <span className="text-slate-400">No reviews</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[9px] font-semibold ${
                            product.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-600"
                              : product.status === "REJECTED"
                              ? "bg-red-100 text-red-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          {product.status === "APPROVED" ? "Active" : product.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product.id}
                          title="Permanently delete this product"
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {deletingId === product.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Showing {filtered.length} {activeTab === "REJECTED" ? "rejected" : "active"} product(s)
          </p>
        </main>
      </div>
    </div>
  );
}
