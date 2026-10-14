"use client";

import { useState } from "react";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import { formatDate } from "@/lib/format-date";
import type { SalesList } from "@/lib/admin/sales";

type TabKey = "PENDING" | "VERIFIED" | "FLAGGED";

const tabs: { key: TabKey; label: string }[] = [
  { key: "PENDING", label: "Pending Verification" },
  { key: "VERIFIED", label: "Verified" },
  { key: "FLAGGED", label: "Flagged / Disputes" },
];

// The interactive part of Sales Verification. The orders arrive already
// loaded from the server (app/admin/sales/page.tsx); changing tab or page
// updates the URL, which asks the server for that data.
export default function SalesVerificationView({ status, data }: { status: TabKey; data: SalesList }) {
  const { orders, pagination } = data;
  const { isPending, setQuery } = useQueryNavigation();
  const [searchTerm, setSearchTerm] = useState("");

  // Filters within the current page only. For fully accurate cross-page
  // search, the search term would need to be sent to the server too.
  const term = searchTerm.trim().toLowerCase();
  const filteredOrders = orders.filter(
    (order) =>
      term === "" ||
      order.buyerName.toLowerCase().includes(term) ||
      order.sellerName.toLowerCase().includes(term) ||
      order.businessName.toLowerCase().includes(term) ||
      order.productNames.toLowerCase().includes(term)
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Financial Sales Verification"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search buyer, seller, product..."
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex gap-1 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setQuery({ status: tab.key, page: null })}
                aria-current={status === tab.key ? "page" : undefined}
                className={`px-4 py-2.5 text-xs font-semibold ${
                  status === tab.key ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="mb-3 text-xs text-slate-500" aria-live="polite">
            {isPending ? "Updating..." : `Showing ${orders.length} of ${pagination.totalCount}`}
          </p>

          <div
            className={`overflow-x-auto rounded-xl border border-slate-200 bg-white transition-opacity ${
              isPending ? "opacity-50" : ""
            }`}
            aria-busy={isPending}
          >
            {orders.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No orders in this category.</p>
            ) : filteredOrders.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No orders match your search on this page.</p>
            ) : (
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Buyer</th>
                    <th className="px-5 py-3">Seller</th>
                    <th className="px-5 py-3">Products</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-3 font-semibold text-slate-800">{order.buyerName}</td>
                      <td className="px-5 py-3">
                        {order.sellerName} <span className="text-slate-400">({order.businessName})</span>
                      </td>
                      <td className="px-5 py-3">{order.productNames}</td>
                      <td className="px-5 py-3 font-semibold text-blue-600">Rs.{order.totalAmount.toFixed(2)}</td>
                      <td className="px-5 py-3 text-slate-400">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/sales/${order.id}`}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700"
                        >
                          Review
                        </Link>
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
