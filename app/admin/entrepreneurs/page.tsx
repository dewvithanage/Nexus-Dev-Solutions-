"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type EntrepreneurRow = {
  id: string;
  fullName: string;
  university: string | null;
  businessName: string;
  primaryCategory: string;
  productCount: number;
  salesVolume: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  appliedAt: string;
};

export default function EntrepreneurManagementPage() {
  const [entrepreneurs, setEntrepreneurs] = useState<EntrepreneurRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [universityFilter, setUniversityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    async function loadEntrepreneurs() {
      try {
        // No ?status= filter here — Management shows EVERYONE, unlike
        // the Approval queue which defaults to just PENDING.
        const response = await fetch("/api/admin/entrepreneurs");
        const data = await response.json();
        if (response.ok) setEntrepreneurs(data.entrepreneurs);
      } catch (error) {
        console.error("Load entrepreneurs error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEntrepreneurs();
  }, []);

  // Build the filter dropdown options from whatever data actually exists,
  // instead of hardcoding a list that might not match reality.
  const universities = useMemo(
    () => ["All", ...new Set(entrepreneurs.map((e) => e.university).filter(Boolean) as string[])],
    [entrepreneurs]
  );
  const categories = useMemo(
    () => ["All", ...new Set(entrepreneurs.map((e) => e.primaryCategory).filter((c) => c !== "—"))],
    [entrepreneurs]
  );

  const filtered = entrepreneurs.filter((entrepreneur) => {
    const matchesSearch =
      !searchTerm ||
      entrepreneur.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entrepreneur.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUniversity =
      universityFilter === "All" || entrepreneur.university === universityFilter;
    const matchesCategory =
      categoryFilter === "All" || entrepreneur.primaryCategory === categoryFilter;

    return matchesSearch && matchesUniversity && matchesCategory;
  });

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Master Entrepreneur Directory"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search database..."
        />

        <main className="p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
                <Search size={14} className="text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search database..."
                  className="w-40 bg-transparent text-xs text-slate-700 outline-none"
                />
              </div>

              <select
                value={universityFilter}
                onChange={(event) => setUniversityFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
              >
                {universities.map((university) => (
                  <option key={university} value={university}>
                    University: {university}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    Category: {category}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/admin/entrepreneurs/approvals"
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Applications to be accepted
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading entrepreneurs...</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No entrepreneurs match your filters.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Entrepreneur Name</th>
                    <th className="px-5 py-3">University Hub</th>
                    <th className="px-5 py-3">Active Brand / Business</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Listed Count</th>
                    <th className="px-5 py-3">Sales Volume</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Join Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((entrepreneur) => (
                    <tr key={entrepreneur.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/entrepreneurs/${entrepreneur.id}`}
                          className="font-semibold text-slate-800 hover:text-blue-600"
                        >
                          {entrepreneur.fullName}
                        </Link>
                      </td>
                      <td className="px-5 py-4">{entrepreneur.university || "—"}</td>
                      <td className="px-5 py-4 font-medium text-blue-600">
                        {entrepreneur.businessName}
                      </td>
                      <td className="px-5 py-4">{entrepreneur.primaryCategory}</td>
                      <td className="px-5 py-4">{entrepreneur.productCount} Products</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        Rs.{entrepreneur.salesVolume.toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-[9px] font-semibold ${
                            entrepreneur.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-600"
                              : entrepreneur.status === "REJECTED"
                              ? "bg-red-100 text-red-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          {entrepreneur.status === "APPROVED" ? "Active" : entrepreneur.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(entrepreneur.appliedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Showing {filtered.length} of {entrepreneurs.length} registered sellers
          </p>
        </main>
      </div>
    </div>
  );
}
