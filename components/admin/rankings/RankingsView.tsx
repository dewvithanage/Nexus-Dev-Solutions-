"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import type { Rankings, RankingsQuery } from "@/lib/admin/rankings";

type PeriodKey = RankingsQuery["period"];

const periods: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const podiumStyles = [
  { card: "border-amber-300 bg-amber-50", icon: "text-amber-500" },
  { card: "border-slate-300 bg-slate-50", icon: "text-slate-400" },
  { card: "border-orange-200 bg-orange-50", icon: "text-orange-400" },
];

// The interactive part of Entrepreneur Rankings. Data arrives already
// loaded from the server; changing period or page updates the URL.
export default function RankingsView({ period, data }: { period: PeriodKey; data: Rankings }) {
  const { podium, rankings, pagination } = data;
  const { isPending, setQuery } = useQueryNavigation();
  const [searchTerm, setSearchTerm] = useState("");

  const term = searchTerm.trim().toLowerCase();
  const searchedRankings = rankings.filter(
    (entry) =>
      term === "" ||
      entry.entrepreneurName.toLowerCase().includes(term) ||
      entry.businessName.toLowerCase().includes(term)
  );
  const firstRankOnPage = 4 + (pagination.currentPage - 1) * pagination.pageSize;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Venture Leaderboard Rankings"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search entrepreneur or business..."
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex items-center gap-2">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setQuery({ period: p.key, page: null })}
                aria-current={period === p.key ? "page" : undefined}
                className={`rounded-md px-4 py-2 text-xs font-semibold ${
                  period === p.key ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-600"
                }`}
              >
                {p.label}
              </button>
            ))}
            {isPending && <span className="ml-2 text-xs text-slate-500" aria-live="polite">Updating...</span>}
          </div>

          <div className={`transition-opacity ${isPending ? "opacity-50" : ""}`} aria-busy={isPending}>
            {podium.length === 0 && rankings.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                No verified sales in this period yet.
              </div>
            ) : (
              <>
                {/* Podium — always shows the true top 3 regardless of page */}
                {podium.length > 0 && (
                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {podium.map((entry, index) => (
                      <div key={entry.businessId} className={`rounded-xl border p-5 text-center ${podiumStyles[index].card}`}>
                        <Trophy size={22} className={`mx-auto ${podiumStyles[index].icon}`} />
                        <p className="mt-2 text-sm font-bold text-slate-900">{entry.businessName}</p>
                        <p className="text-xs text-slate-500">{entry.entrepreneurName}</p>
                        <p className="mt-2 text-lg font-bold text-blue-600">Rs.{entry.revenue.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {searchedRankings.length === 0 ? (
                  rankings.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                      No entrepreneurs match your search on this page.
                    </div>
                  )
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[640px] text-left">
                      <thead className="bg-[#f8fafc]">
                        <tr className="text-[10px] font-semibold text-slate-500">
                          <th className="px-5 py-3">Rank</th>
                          <th className="px-5 py-3">Entrepreneur</th>
                          <th className="px-5 py-3">Business</th>
                          <th className="px-5 py-3">Orders</th>
                          <th className="px-5 py-3">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {searchedRankings.map((entry) => (
                          <tr key={entry.businessId} className="text-[12px] text-slate-600">
                            <td className="px-5 py-3">#{firstRankOnPage + rankings.indexOf(entry)}</td>
                            <td className="px-5 py-3 font-semibold text-slate-800">{entry.entrepreneurName}</td>
                            <td className="px-5 py-3">{entry.businessName}</td>
                            <td className="px-5 py-3">{entry.orderCount}</td>
                            <td className="px-5 py-3 font-semibold text-blue-600">Rs.{entry.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => setQuery({ page })}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
