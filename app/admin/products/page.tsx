"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

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

export default function ProductManagementPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    async function loadProducts() {
      try {
        // No status filter — Management shows every product, same
        // pattern as the Entrepreneur Management directory.
        const response = await fetch("/api/admin/products");
        const data = await response.json();
        if (response.ok) setProducts(data.products);
      } catch (error) {
        console.error("Load products error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((p) => p.category))],
    [products]
  );

  const filtered = products.filter((product) => {
    const matchesCategory = categoryFilter === "All" || product.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || product.status === statusFilter;
    return matchesCategory && matchesStatus;
  });

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Master Venture Directory" />

        <main className="p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
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

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
              >
                <option value="All">Status: All</option>
                <option value="PENDING">Status: Pending</option>
                <option value="APPROVED">Status: Active</option>
                <option value="REJECTED">Status: Rejected</option>
              </select>
            </div>

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
              <p className="p-8 text-sm text-slate-500">No products match your filters.</p>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Showing {filtered.length} of {products.length} listed ventures
          </p>
        </main>
      </div>
    </div>
  );
}
