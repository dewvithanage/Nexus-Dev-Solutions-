"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type RankingEntry = {
  rank: number;
  businessId: string;
  entrepreneurName: string;
  university: string | null;
  businessName: string;
  listedProducts: number;
  salesCount: number;
  revenue: number;
  averageRating: number | null;
};

type PeriodKey = "week" | "month" | "all";

const periods: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const podiumStyle: Record<number, { label: string; badge: string; border: string }> = {
  1: { label: "Gold Winner", badge: "bg-amber-400 text-white", border: "border-amber-300" },
  2: { label: "Silver", badge: "bg-slate-300 text-white", border: "border-slate-300" },
  3: { label: "Bronze", badge: "bg-orange-700 text-white", border: "border-orange-300" },
};

export default function EntrepreneurRankingsPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/rankings?period=${period}`)
      .then((response) => response.json())
      .then((data) => setRankings(data.rankings || []))
      .finally(() => setLoading(false));
  }, [period]);

  const podium = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Venture Leaderboard Rankings" />

        <main className="p-8">
          <div className="mb-6 flex gap-2">
            {periods.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                  period === p.key
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading rankings...</p>
          ) : rankings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No verified sales in this period yet.
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                {podium.map((entry) => {
                  const style = podiumStyle[entry.rank];
                  return (
                    <div key={entry.businessId} className={`rounded-xl border-2 bg-white p-5 ${style.border}`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <Trophy size={14} /> {style.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${style.badge}`}>
                          Rank #{entry.rank}
                        </span>
                      </div>
                      <p className="mt-3 text-base font-bold text-slate-900">{entry.entrepreneurName}</p>
                      <p className="text-xs text-slate-400">{entry.university}</p>
                      <div className="mt-4 flex justify-between text-xs">
                        <div>
                          <p className="text-slate-400">Revenue</p>
                          <p className="font-bold text-blue-600">Rs.{entry.revenue.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Sales Count</p>
                          <p className="font-bold text-slate-800">{entry.salesCount}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {rest.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8fafc]">
                      <tr className="text-[10px] font-semibold text-slate-500">
                        <th className="px-5 py-3">Rank</th>
                        <th className="px-5 py-3">Entrepreneur Name</th>
                        <th className="px-5 py-3">Faculty</th>
                        <th className="px-5 py-3">Listed Products</th>
                        <th className="px-5 py-3">Sales Count</th>
                        <th className="px-5 py-3">Revenue Generated</th>
                        <th className="px-5 py-3">Avg Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rest.map((entry) => (
                        <tr key={entry.businessId} className="text-[12px] text-slate-600">
                          <td className="px-5 py-4 font-semibold text-slate-800">#{entry.rank}</td>
                          <td className="px-5 py-4 font-semibold text-slate-800">{entry.entrepreneurName}</td>
                          <td className="px-5 py-4">{entry.university}</td>
                          <td className="px-5 py-4">{entry.listedProducts} Items</td>
                          <td className="px-5 py-4">{entry.salesCount}</td>
                          <td className="px-5 py-4 font-bold text-blue-600">Rs.{entry.revenue.toFixed(0)}</td>
                          <td className="px-5 py-4">
                            {entry.averageRating ? `★ ${entry.averageRating}` : "No reviews"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
