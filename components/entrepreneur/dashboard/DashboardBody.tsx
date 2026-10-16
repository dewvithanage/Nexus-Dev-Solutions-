"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Package, Clock3, CircleCheck, DollarSign, TrendingUp } from "lucide-react";
import type { EntrepreneurDashboardStats } from "@/lib/entrepreneur-dashboard";

function formatRupees(amount: number) {
  return `Rs.${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardBody({ name, initialStats, children }: {
  name: string;
  initialStats: EntrepreneurDashboardStats;
  children: ReactNode;
}) {
  const [stats, setStats] = useState(initialStats);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { activeProducts, pendingProducts, productsAddedThisWeek, completedSales,
    salesThisWeek, salesChange, totalRevenue, weekRevenue } = stats;

  async function refreshStats() {
    if (refreshing) return;
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/entrepreneurs/dashboard-stats", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Unable to refresh statistics.");
        return;
      }
      setStats(data);
    } catch {
      setError("Unable to refresh statistics. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
        <main className="p-4 sm:p-6 lg:p-8" aria-busy={refreshing}>
          <div className="mb-4 flex justify-end">
            <button onClick={refreshStats} disabled={refreshing} className="rounded-md border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-600 disabled:opacity-60">
              {refreshing ? "Refreshing..." : "Refresh statistics"}
            </button>
          </div>
          {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <section className="flex min-h-[130px] flex-col items-start justify-between gap-4 rounded-xl bg-[#2d67e8] px-5 py-6 text-white sm:flex-row sm:items-center sm:px-8">
            <div>
              <h2 className="text-[20px] font-bold sm:text-[22px]">Welcome back, {name}! ⚡</h2>
              <p className="mt-2 max-w-[650px] text-xs leading-5 text-blue-100">
                {salesThisWeek > 0
                  ? `You completed ${salesThisWeek} verified sale${salesThisWeek === 1 ? "" : "s"} this week. Keep up the amazing student hustle!`
                  : activeProducts > 0
                  ? `You have ${activeProducts} product${activeProducts === 1 ? "" : "s"} live in the marketplace.`
                  : "Add your first product to start selling on campus."}
              </p>
            </div>

            <Link
              href="/entrepreneur/products/add"
              className="shrink-0 rounded-md bg-[#f5a900] px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-[#e99f00]"
            >
              Add Product
            </Link>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Total Products</p>
                <Package size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{activeProducts} Active</h3>
              <p className="mt-1 text-[10px] text-slate-500">{pendingProducts} Pending Review</p>
              {productsAddedThisWeek > 0 && (
                <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-500">
                  <TrendingUp size={12} />+{productsAddedThisWeek} added this week
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Pending Approvals</p>
                <Clock3 size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{pendingProducts}</h3>
              <p className="mt-1 text-[10px] text-slate-500">Products waiting for admin review</p>
              {pendingProducts > 0 && <p className="mt-3 text-[10px] text-amber-500">◉ Admin review in progress</p>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Completed Sales</p>
                <CircleCheck size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                {completedSales} Order{completedSales === 1 ? "" : "s"}
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">Verified by an admin</p>
              {salesChange !== null && (
                <div
                  className={`mt-3 flex items-center gap-1 text-[10px] ${
                    salesChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  <TrendingUp size={12} />
                  {salesChange >= 0 ? "+" : ""}
                  {salesChange}% vs last week
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Total Revenue</p>
                <DollarSign size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{formatRupees(totalRevenue)}</h3>
              <p className="mt-1 text-[10px] text-slate-500">Revenue from verified sales</p>
              {weekRevenue > 0 && (
                <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-500">
                  <TrendingUp size={12} />+{formatRupees(weekRevenue)} this week
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[3fr_1fr]">
            {children}
          </section>
        </main>
  );
}
