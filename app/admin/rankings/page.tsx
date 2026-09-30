"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";

type RankingEntry = {
  businessId: string;
  entrepreneurName: string;
  businessName: string;
  revenue: number;
  orderCount: number;
};

type PaginationInfo = { currentPage: number; totalPages: number; totalCount: number };
type PeriodKey = "week" | "month" | "all";

export default function EntrepreneurRankingsPage() {
  const [podium, setPodium] = useState<RankingEntry[]>([]);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/rankings?period=${period}&page=${page}`)
      .then((response) => response.json())
      .then((data) => {
        setPodium(data.podium || []);
        setRankings(data.rankings || []);
        setPagination(data.pagination || null);
      })
      .finally(() => setLoading(false));
  }, [period, page]);

  const searchedRankings = rankings.filter((entry) => {
    const term = searchTerm.trim().toLowerCase();
    if (term === "") return true;
    return (
      entry.entrepreneurName.toLowerCase().includes(term) ||
      entry.businessName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Venture Leaderboard Rankings"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search entrepreneur or business..."
        />

        <main className="p-8">
          <div className="mb-5 flex gap-2">
            {(["week", "month", "all"] as PeriodKey[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-4 py-2 text-xs font-semibold ${
                  period === p ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-600"
                }`}
              >
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading rankings...</p>
          ) : podium.length === 0 && rankings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No verified sales in this period yet.
            </div>
          ) : (
            <>
              {/* Podium — always shows the true top 3 regardless of page */}
              {podium.length > 0 && (
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {podium.map((entry, index) => (
                    <div
                      key={entry.businessId}
                      className={`rounded-xl border p-5 text-center ${
                        index === 0
                          ? "border-amber-300 bg-amber-50"
                          : index === 1
                          ? "border-slate-300 bg-slate-50"
                          : "border-orange-200 bg-orange-50"
                      }`}
                    >
                      <Trophy
                        size={22}
                        className={`mx-auto ${
                          index === 0 ? "text-amber-500" : index === 1 ? "text-slate-400" : "text-orange-400"
                        }`}
                      />
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
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left">
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
                      {searchedRankings.map((entry, index) => (
                        <tr key={entry.businessId} className="text-[12px] text-slate-600">
                          <td className="px-5 py-3">
                            #{4 + (pagination ? (pagination.currentPage - 1) * 10 : 0) + index}
                          </td>
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

              {pagination && (
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
