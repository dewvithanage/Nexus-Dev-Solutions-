"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Clock3, DollarSign, Package } from "lucide-react";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type ActivityEvent = {
  type: string;
  name: string;
  description: string;
  status: string;
};

type AdminDashboardBodyProps = {
  adminName: string;
  totalEntrepreneurs: number;
  pendingEntrepreneurs: number;
  pendingProducts: number;
  activeProducts: number;
  totalSalesVolume: number;
  ordersCount: number;
  activity: ActivityEvent[];
};

// This whole body is a CLIENT component (unlike the page.tsx that renders
// it, which stays a Server Component fetching straight from Prisma) —
// it needs to be, since the search box's state has to be shared between
// the header (sets it) and the Recent Activity table (reads it), and
// those two aren't next to each other in the layout, so the shared state
// has to live above both of them. All the actual numbers/data are passed
// in as plain, serializable props from the server component below.
export default function AdminDashboardBody({
  adminName,
  totalEntrepreneurs,
  pendingEntrepreneurs,
  pendingProducts,
  activeProducts,
  totalSalesVolume,
  ordersCount,
  activity,
}: AdminDashboardBodyProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const pendingApprovalsTotal = pendingEntrepreneurs + pendingProducts;

  const filteredActivity = activity.filter((event) => {
    const term = searchTerm.trim().toLowerCase();
    if (term === "") return true;
    return (
      event.name.toLowerCase().includes(term) ||
      event.description.toLowerCase().includes(term) ||
      event.type.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <DashboardHeader
        title="Executive Dashboard"
        notificationsHref="/admin/notifications"
        onSearch={setSearchTerm}
        searchPlaceholder="Search activity..."
      />

      <main className="p-8">
        <section className="flex min-h-[110px] items-center rounded-xl bg-[#2d67e8] px-8 text-white">
          <div>
            <h2 className="text-[20px] font-bold">Welcome back, {adminName}!</h2>
            <p className="mt-2 max-w-[650px] text-xs leading-5 text-blue-100">
              {pendingApprovalsTotal > 0
                ? `There are ${pendingApprovalsTotal} pending applications/products waiting for review.`
                : "No pending approvals right now — all caught up!"}
            </p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex justify-between">
              <p className="text-xs font-medium text-slate-500">Total Entrepreneurs</p>
              <Users size={17} className="text-blue-600" />
            </div>
            <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{totalEntrepreneurs}</h3>
            <p className="mt-1 text-[10px] text-slate-500">{pendingEntrepreneurs} pending review</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex justify-between">
              <p className="text-xs font-medium text-slate-500">Pending Approvals</p>
              <Clock3 size={17} className="text-blue-600" />
            </div>
            <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{pendingApprovalsTotal}</h3>
            <p className="mt-1 text-[10px] text-slate-500">
              {pendingEntrepreneurs} regs + {pendingProducts} products
            </p>
            {pendingApprovalsTotal > 0 && (
              <p className="mt-3 text-[10px] text-amber-500">◉ Admin action required</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex justify-between">
              <p className="text-xs font-medium text-slate-500">Total Sales Volume</p>
              <DollarSign size={17} className="text-blue-600" />
            </div>
            <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
              Rs. {totalSalesVolume.toFixed(2)}
            </h3>
            <p className="mt-1 text-[10px] text-slate-500">{ordersCount} orders placed</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex justify-between">
              <p className="text-xs font-medium text-slate-500">Active Products</p>
              <Package size={17} className="text-blue-600" />
            </div>
            <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{activeProducts} Listed</h3>
            <p className="mt-1 text-[10px] text-slate-500">{pendingProducts} awaiting approval</p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[3fr_1fr]">
          <div>
            <h2 className="mb-4 text-[16px] font-bold text-[#101828]">Recent Activity</h2>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {activity.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No activity yet.</p>
              ) : filteredActivity.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No activity matches your search.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-[#f8fafc]">
                    <tr className="text-[10px] text-slate-500">
                      <th className="px-5 py-3 font-medium">Event</th>
                      <th className="px-5 py-3 font-medium">From</th>
                      <th className="px-5 py-3 font-medium">Description</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActivity.map((event, index) => (
                      <tr key={index} className="text-[11px] text-slate-600">
                        <td className="px-5 py-4 font-semibold text-slate-800">{event.type}</td>
                        <td className="px-5 py-4">{event.name}</td>
                        <td className="px-5 py-4">{event.description}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-[9px] font-medium ${
                              event.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-600"
                                : event.status === "REJECTED"
                                ? "bg-red-100 text-red-600"
                                : "bg-amber-100 text-amber-600"
                            }`}
                          >
                            {event.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-[15px] font-bold text-[#101828]">Administrative Actions</h2>

            <div className="mt-4 space-y-2">
              <Link
                href="/admin/entrepreneurs/approvals"
                className="block rounded-md border border-slate-200 px-4 py-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Review Pending Entrepreneurs
              </Link>
              <Link
                href="/admin/products/approvals"
                className="block rounded-md border border-slate-200 px-4 py-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Review Pending Products
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
