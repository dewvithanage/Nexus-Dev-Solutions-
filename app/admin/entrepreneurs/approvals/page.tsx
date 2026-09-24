"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type EntrepreneurRow = {
  id: string;
  fullName: string;
  email: string;
  university: string | null;
  businessName: string;
  primaryCategory: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  appliedAt: string;
};

type TabKey = "PENDING" | "ALL" | "REJECTED";

const tabs: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All Applications" },
  { key: "PENDING", label: "Pending Approvals" },
  { key: "REJECTED", label: "Archived / Rejected" },
];

export default function EntrepreneurRegistrationApprovalPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("PENDING");
  const [entrepreneurs, setEntrepreneurs] = useState<EntrepreneurRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEntrepreneurs() {
      setLoading(true);
      try {
        // "ALL" means don't send a status filter at all — the API route
        // returns everyone when no ?status= is given.
        const query = activeTab === "ALL" ? "" : `?status=${activeTab}`;
        const response = await fetch(`/api/admin/entrepreneurs${query}`);
        const data = await response.json();
        if (response.ok) setEntrepreneurs(data.entrepreneurs);
      } catch (error) {
        console.error("Load entrepreneurs error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEntrepreneurs();
  }, [activeTab]);

  const pendingCount = entrepreneurs.filter((e) => e.status === "PENDING").length;

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Pending Registrations Queue" notificationsHref="/admin/notifications" />

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
                {tab.key === "PENDING" && activeTab !== "PENDING" && pendingCount > 0
                  ? ` (${pendingCount})`
                  : ""}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading applications...</p>
            ) : entrepreneurs.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No applications in this category.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">App Date</th>
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Faculty</th>
                    <th className="px-5 py-3">Proposed Business Name</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entrepreneurs.map((entrepreneur) => (
                    <tr key={entrepreneur.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(entrepreneur.appliedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {entrepreneur.fullName}
                      </td>
                      <td className="px-5 py-4">{entrepreneur.university || "—"}</td>
                      <td className="px-5 py-4 font-medium text-blue-600">
                        {entrepreneur.businessName}
                      </td>
                      <td className="px-5 py-4">{entrepreneur.primaryCategory}</td>
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
                          {entrepreneur.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/entrepreneurs/${entrepreneur.id}`}
                          className="rounded-md bg-blue-600 px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                        >
                          View
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
