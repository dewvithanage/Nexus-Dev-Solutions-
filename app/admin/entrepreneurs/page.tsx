"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";

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

type PaginationInfo = { currentPage: number; totalPages: number; totalCount: number };
type TabKey = "ACTIVE" | "REJECTED";

export default function EntrepreneurManagementPage() {
  const [entrepreneurs, setEntrepreneurs] = useState<EntrepreneurRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("ACTIVE");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Changing tab or search should always jump back to page 1 — staying
  // on, say, page 3 after switching tabs could land on an empty page
  // that doesn't exist for the new filter.
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    loadEntrepreneurs();
  }, [activeTab, searchTerm, page]);

  async function loadEntrepreneurs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (searchTerm) params.set("search", searchTerm);
      params.set("page", String(page));

      const response = await fetch(`/api/admin/entrepreneurs?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setEntrepreneurs(data.entrepreneurs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Load entrepreneurs error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(entrepreneur: EntrepreneurRow) {
    const confirmed = window.confirm(
      `Permanently delete "${entrepreneur.fullName}" and their business "${entrepreneur.businessName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(entrepreneur.id);
    try {
      const response = await fetch(`/api/admin/entrepreneurs/${entrepreneur.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to delete this entrepreneur.");
        return;
      }

      loadEntrepreneurs();
    } catch (error) {
      console.error("Delete entrepreneur error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

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
          <div className="mb-5 flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-4 py-2.5 text-xs font-semibold ${
                activeTab === "ACTIVE" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Active Entrepreneurs
            </button>
            <button
              onClick={() => setActiveTab("REJECTED")}
              className={`px-4 py-2.5 text-xs font-semibold ${
                activeTab === "REJECTED" ? "border-b-2 border-red-600 text-red-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Rejected
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {pagination ? `Showing ${entrepreneurs.length} of ${pagination.totalCount}` : ""}
            </p>

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
            ) : entrepreneurs.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">
                {activeTab === "REJECTED" ? "No rejected entrepreneurs." : "No entrepreneurs match your filters."}
              </p>
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
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entrepreneurs.map((entrepreneur) => (
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
                      <td className="px-5 py-4 font-medium text-blue-600">{entrepreneur.businessName}</td>
                      <td className="px-5 py-4">{entrepreneur.primaryCategory}</td>
                      <td className="px-5 py-4">{entrepreneur.productCount} Products</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        Rs.{Number(entrepreneur.salesVolume).toFixed(2)}
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
                          {entrepreneur.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(entrepreneur.appliedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDelete(entrepreneur)}
                          disabled={deletingId === entrepreneur.id}
                          title="Permanently delete this entrepreneur"
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {deletingId === entrepreneur.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pagination && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </main>
      </div>
    </div>
  );
}
