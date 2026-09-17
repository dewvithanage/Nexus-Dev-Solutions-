"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type OrderRow = {
  id: string;
  buyerName: string;
  sellerName: string;
  businessName: string;
  productNames: string;
  totalAmount: number;
  status: string;
  hasProof: boolean;
  createdAt: string;
};

type TabKey = "PENDING" | "VERIFIED" | "FLAGGED";

const tabs: { key: TabKey; label: string }[] = [
  { key: "PENDING", label: "Pending Verification" },
  { key: "VERIFIED", label: "Verified" },
  { key: "FLAGGED", label: "Flagged / Disputes" },
];

export default function SalesVerificationPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("PENDING");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/sales?status=${activeTab}`)
      .then((response) => response.json())
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Financial Sales Verification" />

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
              <p className="p-8 text-sm text-slate-500">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No orders in this category.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Order ID</th>
                    <th className="px-5 py-3">Venture Product</th>
                    <th className="px-5 py-3">Seller</th>
                    <th className="px-5 py-3">Buyer</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Order Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-4 font-semibold text-slate-800">TX-{order.id.slice(-4)}</td>
                      <td className="px-5 py-4">{order.productNames}</td>
                      <td className="px-5 py-4">{order.sellerName}</td>
                      <td className="px-5 py-4">{order.buyerName}</td>
                      <td className="px-5 py-4 font-bold text-blue-600">
                        Rs.{Number(order.totalAmount).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[9px] font-semibold ${
                            order.status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-600"
                              : order.status === "FLAGGED"
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {order.status === "PENDING_VERIFICATION" ? "Reviewing" : order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/sales/${order.id}`}
                          className="rounded-md bg-blue-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                        >
                          Audit
                        </Link>
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
