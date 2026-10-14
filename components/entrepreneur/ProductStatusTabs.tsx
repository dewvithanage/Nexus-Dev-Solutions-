"use client";

import { useState } from "react";
import Link from "next/link";

// Interactive part of the Product Submission Status page: the tabs only
// filter the list the server already sent, so switching tabs needs no
// request. The page (a Server Component) loads the products.

export type StatusProduct = {
  id: string;
  name: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  // Formatted on the server, so the server-rendered HTML and the browser
  // always show the same text.
  submittedOn: string;
  imageUrl: string | null;
};

type TabKey = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const tabs: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All Submissions" },
  { key: "PENDING", label: "Pending Review" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

export default function ProductStatusTabs({ products }: { products: StatusProduct[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");

  const filtered = activeTab === "ALL" ? products : products.filter((p) => p.status === activeTab);

  return (
    <>
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

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            {filtered.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No products in this category.</p>
            ) : (
              <table className="w-full min-w-[640px] text-left">
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
                            {product.imageUrl && (
                              <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <span className="font-semibold text-slate-800">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {product.submittedOn}
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
    </>
  );
}
