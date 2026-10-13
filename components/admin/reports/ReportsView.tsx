"use client";

import { useState } from "react";
import { TrendingUp, ShoppingBag, Users, Package, Download } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import type { ReportSummary } from "@/lib/admin/reports";

const barColors = ["#2563EB", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

const pdfReports = {
  audit: { url: "/api/admin/reports/monthly-sales-audit", name: "Monthly Sales Audit" },
  directory: { url: "/api/admin/reports/entrepreneur-directory", name: "Entrepreneur Directory Summary" },
} as const;

type PdfKey = keyof typeof pdfReports;

// The interactive part of Reports & Analytics (search and PDF downloads).
// The figures arrive already calculated by the server.
export default function ReportsView({ report }: { report: ReportSummary }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [downloading, setDownloading] = useState<PdfKey | null>(null);
  const [downloadError, setDownloadError] = useState("");

  async function downloadPdf(key: PdfKey) {
    const { url, name } = pdfReports[key];
    setDownloadError("");
    setDownloading(key);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${name} download failed: ${res.status}`);
      // Use the file name the server chose (it includes the date).
      const fileName =
        res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `${key}.pdf`;
      const blobUrl = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("PDF download error:", error);
      setDownloadError(`The ${name} PDF couldn't be generated. Please try again.`);
    } finally {
      setDownloading(null);
    }
  }

  const maxMonthlyRevenue = Math.max(...report.monthlyTrend.map((m) => m.revenue), 1);
  const maxCategoryRevenue = Math.max(...report.categoryRevenue.map((c) => c.revenue), 1);
  const totalCategoryRevenue = report.categoryRevenue.reduce((sum, c) => sum + c.revenue, 0);

  const term = searchTerm.trim().toLowerCase();
  const filteredCategoryRevenue = report.categoryRevenue.filter(
    (entry) => term === "" || entry.category.toLowerCase().includes(term)
  );

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
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Platform Performance Overview</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadPdf("audit")}
                disabled={downloading !== null}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Download size={15} />
                {downloading === "audit" ? "Generating..." : pdfReports.audit.name}
              </button>
              <button
                onClick={() => downloadPdf("directory")}
                disabled={downloading !== null}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Download size={15} />
                {downloading === "directory" ? "Generating..." : pdfReports.directory.name}
              </button>
            </div>
          </div>
          {downloadError && (
            <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
              {downloadError}
            </p>
          )}

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
