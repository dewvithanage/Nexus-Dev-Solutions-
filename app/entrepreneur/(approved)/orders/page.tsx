import Link from "next/link";
import { TrendingUp, Activity, CircleCheck, Clock3 } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import { getOwnOrders, requireEntrepreneurPage } from "@/lib/entrepreneur-data";

const statusLabels: Record<string, { label: string; style: string }> = {
  PENDING: { label: "Pending", style: "bg-amber-100 text-amber-600" },
  AWAITING_FULFILLMENT: { label: "Awaiting Handoff", style: "bg-amber-100 text-amber-600" },
  PENDING_VERIFICATION: { label: "Verifying", style: "bg-blue-100 text-blue-600" },
  VERIFIED: { label: "Completed", style: "bg-emerald-100 text-emerald-600" },
  FLAGGED: { label: "Flagged", style: "bg-red-100 text-red-600" },
  CANCELLED: { label: "Cancelled", style: "bg-slate-100 text-slate-500" },
};

// Server Component: the seller's orders and the four figures above them are
// worked out on the server (getOwnOrders), so the page arrives complete
// instead of fetching /api/orders/mine in the browser afterwards. Rendered
// on every request, so proof submitted a moment ago is reflected at once.
export default async function CompletedSalesPage() {
  const { business, sidebar } = await requireEntrepreneurPage();
  const { orders, stats } = await getOwnOrders(business.id);

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row bg-[#F5F7FA]">
      <Sidebar entrepreneur={sidebar} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Sales & Orders History" />

        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6">
          <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Total Sales Revenue</p>
                <Activity size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                Rs.{stats.totalRevenue.toFixed(2)}
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">Cumulative Student Cash</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Average Order Value</p>
                <TrendingUp size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                Rs.{stats.averageOrderValue.toFixed(2)}
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">Per order placed</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Units Delivered</p>
                <CircleCheck size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{stats.unitsDelivered}</h3>
              <p className="mt-1 text-[10px] text-slate-500">Verified & completed</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Pending Escrow</p>
                <Clock3 size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                Rs.{stats.pendingEscrow.toFixed(2)}
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">In processing transit</p>
            </div>
          </section>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            {orders.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">
                No orders yet. Orders placed for your products will appear here.
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Order ID</th>
                    <th className="px-5 py-3">Customer Name</th>
                    <th className="px-5 py-3">Product Purchased</th>
                    <th className="px-5 py-3">Quantity</th>
                    <th className="px-5 py-3">Total Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const statusInfo = statusLabels[order.status] ?? { label: order.status, style: "bg-slate-100 text-slate-500" };
                    const needsConfirmation = order.status === "AWAITING_FULFILLMENT" || order.status === "PENDING";

                    return (
                      <tr key={order.id} className="text-[12px] text-slate-600">
                        <td className="px-5 py-4 font-semibold text-slate-800">#{order.id.slice(-6)}</td>
                        <td className="px-5 py-4">{order.buyerName}</td>
                        <td className="px-5 py-4">{order.items.map((item) => item.product.name).join(", ")}</td>
                        <td className="px-5 py-4">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          Rs.{order.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-[9px] font-semibold ${statusInfo.style}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {needsConfirmation && !order.salesConfirmation ? (
                            <Link
                              href={`/entrepreneur/sales/${order.id}/upload`}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                            >
                              Submit Confirmation
                            </Link>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
