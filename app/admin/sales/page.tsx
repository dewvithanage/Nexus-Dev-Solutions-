"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";

type OrderRow = {
  id: string;
  buyerName: string;
  sellerName: string;
  businessName: string;
  productNames: string;
  totalAmount: number;
  status: string;
  createdAt: string;
};

type PaginationInfo = { currentPage: number; totalPages: number; totalCount: number };
type TabKey = "PENDING" | "VERIFIED" | "FLAGGED";

export default function SalesVerificationPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("PENDING");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", activeTab);
    params.set("page", String(page));

    fetch(`/api/admin/sales?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        setOrders(data.orders || []);
        setPagination(data.pagination || null);
      })
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  // Same as Content Management — this filters within the current page
  // only. For fully accurate cross-page search, the search term would
  // need to be sent to the API and applied server-side too.
  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.trim().toLowerCase();
    if (term === "") return true;
    return (
      order.buyerName.toLowerCase().includes(term) ||
      order.sellerName.toLowerCase().includes(term) ||
      order.businessName.toLowerCase().includes(term) ||
      order.productNames.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Financial Sales Verification"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search buyer, seller, product..."
        />

        <main className="p-8">
          <div className="mb-5 flex gap-1 border-b border-slate-200">
            {(["PENDING", "VERIFIED", "FLAGGED"] as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-semibold ${
                  activeTab === tab ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "PENDING" ? "Pending Verification" : tab === "VERIFIED" ? "Verified" : "Flagged / Disputes"}
              </button>
            ))}
          </div>

          {pagination && (
            <p className="mb-3 text-xs text-slate-500">
              Showing {orders.length} of {pagination.totalCount}
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No orders in this category.</p>
            ) : filteredOrders.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No orders match your search on this page.</p>
            ) : (
              <table className="w-full text-left">
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
                      <td className="px-5 py-3 font-semibold text-blue-600">
                        Rs.{Number(order.totalAmount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
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
