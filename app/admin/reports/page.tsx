"use client";

import { useEffect, useState } from "react";
import { TrendingUp, ShoppingBag, Users, Package } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type ReportData = {
  totalRevenue: number;
  revenueChangePercent: number;
  totalOrders: number;
  orderCountChangePercent: number;
  activeEntrepreneurs: number;
  newEntrepreneursThisWeek: number;
  activeProducts: number;
  categoryRevenue: { category: string; revenue: number }[];
  monthlyTrend: { month: string; revenue: number }[];
};

const barColors = ["#2563EB", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

export default function ReportsAnalyticsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((response) => response.json())
      .then((data) => setReport(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !report) {
    return (
      <div className="flex min-h-screen bg-[#f6f8fb]">
        <AdminSidebar />
        <div className="flex-1 p-8 text-sm text-slate-500">Loading reports...</div>
      </div>
    );
  }

  const maxMonthlyRevenue = Math.max(...report.monthlyTrend.map((m) => m.revenue), 1);
  const maxCategoryRevenue = Math.max(...report.categoryRevenue.map((c) => c.revenue), 1);
  const totalCategoryRevenue = report.categoryRevenue.reduce((sum, c) => sum + c.revenue, 0);

  // FIX: header search box was previously disabled here since the
  // monthly revenue trend chart (months, not named entities) genuinely
  // isn't something you'd "search" — but the Revenue by Category
  // breakdown DOES have named items, so the search box now filters
  // that section by category name.
  const filteredCategoryRevenue = report.categoryRevenue.filter((entry) => {
    const term = searchTerm.trim().toLowerCase();
    return term === "" || entry.category.toLowerCase().includes(term);
  });

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Executive Reports & Analytics"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search category..."
        />

        <main className="p-8">
          <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Platform Total Revenue</p>
                <TrendingUp size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">Rs.{report.totalRevenue.toFixed(2)}</h3>
              <p className={`mt-1 text-[10px] ${report.revenueChangePercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {report.revenueChangePercent >= 0 ? "▲" : "▼"} {Math.abs(report.revenueChangePercent)}% vs last week
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Platform Sales Count</p>
                <ShoppingBag size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{report.totalOrders} Orders</h3>
              <p className={`mt-1 text-[10px] ${report.orderCountChangePercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {report.orderCountChangePercent >= 0 ? "▲" : "▼"} {Math.abs(report.orderCountChangePercent)}% vs last week
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Active Sellers</p>
                <Users size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{report.activeEntrepreneurs} Active</h3>
              <p className="mt-1 text-[10px] text-emerald-500">+{report.newEntrepreneursThisWeek} this week</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Listed Ventures</p>
                <Package size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{report.activeProducts} Listed</h3>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-bold text-slate-900">Sales Revenue Trend (Last 6 Months)</h3>
              <div className="flex h-40 items-end gap-3">
                {report.monthlyTrend.map((point) => (
                  <div key={point.month} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-blue-500"
                      style={{ height: `${Math.max(4, (point.revenue / maxMonthlyRevenue) * 130)}px` }}
                      title={`Rs.${point.revenue.toFixed(2)}`}
                    />
                    <span className="text-[9px] text-slate-400">{point.month}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-bold text-slate-900">Revenue by Category</h3>
              {report.categoryRevenue.length === 0 ? (
                <p className="text-xs text-slate-500">No verified sales yet to break down by category.</p>
              ) : filteredCategoryRevenue.length === 0 ? (
                <p className="text-xs text-slate-500">No category matches your search.</p>
              ) : (
                <div className="space-y-3">
                  {filteredCategoryRevenue.map((entry, index) => (
                    <div key={entry.category}>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="font-medium text-slate-700">{entry.category}</span>
                        <span className="text-slate-500">
                          {((entry.revenue / totalCategoryRevenue) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(entry.revenue / maxCategoryRevenue) * 100}%`,
                            backgroundColor: barColors[index % barColors.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
