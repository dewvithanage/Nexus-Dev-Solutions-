"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type Product = {
  id: string;
  name: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  createdAt: string;
  images: { url: string }[];
};

type TabKey = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const tabs: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All Submissions" },
  { key: "PENDING", label: "Pending Review" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

export default function ProductSubmissionStatusPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then((data) => setProducts(data.products || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === "ALL" ? products : products.filter((p) => p.status === activeTab);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Product Submission Status" />

        <main className="flex-1 overflow-auto px-6 py-5">
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
              <p className="p-8 text-sm text-slate-500">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No products in this category.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">Submitted Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Reviewer Feedback</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((product) => (
                    <tr key={product.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 overflow-hidden rounded-md bg-slate-100">
                            {product.images[0] && (
                              <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <span className="font-semibold text-slate-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[9px] font-semibold ${
                            product.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-600"
                              : product.status === "REJECTED"
                              ? "bg-red-100 text-red-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          {product.status === "PENDING" ? "Pending Review" : product.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 italic text-slate-500">
                        {product.rejectionReason || (product.status === "PENDING" ? "Awaiting admin review." : "—")}
                      </td>
                      <td className="px-5 py-4">
                        {product.status === "REJECTED" ? (
                          <Link
                            href={`/entrepreneur/products/${product.id}/edit`}
                            className="rounded-md bg-blue-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                          >
                            Resubmit
                          </Link>
                        ) : (
                          <Link
                            href={`/entrepreneur/products/${product.id}/edit`}
                            className="text-[11px] font-semibold text-blue-600 hover:underline"
                          >
                            View Details
                          </Link>
                        )}
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
