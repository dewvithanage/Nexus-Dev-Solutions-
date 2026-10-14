"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";
import StatusBadge from "@/components/admin/StatusBadge";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import { formatDate } from "@/lib/format-date";
import type { EntrepreneurList, EntrepreneurRow } from "@/lib/admin/entrepreneurs";

type TabKey = "ACTIVE" | "REJECTED";

// The interactive part of Entrepreneur Management. The rows arrive already
// loaded from the server (app/admin/entrepreneurs/page.tsx); tab, search
// and page number live in the URL, so changing them asks the server for
// that data (search runs in the database, across every page).
export default function EntrepreneurManagementView({
  tab,
  search,
  data,
}: {
  tab: TabKey;
  search: string;
  data: EntrepreneurList;
}) {
  const { entrepreneurs, pagination } = data;
  const { isPending, setQuery, refresh } = useQueryNavigation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // Waits until typing pauses, so each keystroke doesn't load a new page.
  function handleSearch(value: string) {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setQuery({ search: value.trim() || null, page: null });
    }, 300);
  }

  async function handleDelete(entrepreneur: EntrepreneurRow) {
    const confirmed = window.confirm(
      `Permanently delete "${entrepreneur.fullName}" and their business "${entrepreneur.businessName}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(entrepreneur.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/entrepreneurs/${entrepreneur.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.message || "Unable to delete this entrepreneur.");
      }
      // Re-render from the database either way, so the list shows the real
      // state (also if someone else changed it first).
      refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Master Entrepreneur Directory"
          notificationsHref="/admin/notifications"
          onSearch={handleSearch}
          searchDefaultValue={search}
          searchPlaceholder="Search database..."
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setQuery({ tab: null, page: null })}
              aria-current={tab === "ACTIVE" ? "page" : undefined}
              className={`px-4 py-2.5 text-xs font-semibold ${
                tab === "ACTIVE" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Active Entrepreneurs
            </button>
            <button
              onClick={() => setQuery({ tab: "REJECTED", page: null })}
              aria-current={tab === "REJECTED" ? "page" : undefined}
              className={`px-4 py-2.5 text-xs font-semibold ${
                tab === "REJECTED" ? "border-b-2 border-red-600 text-red-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Rejected
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500" aria-live="polite">
              {isPending ? "Updating..." : `Showing ${entrepreneurs.length} of ${pagination.totalCount}`}
            </p>

            <Link
              href="/admin/entrepreneurs/approvals"
              className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Applications to be accepted
            </Link>
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div
            className={`overflow-x-auto rounded-xl border border-slate-200 bg-white transition-opacity ${
              isPending ? "opacity-50" : ""
            }`}
            aria-busy={isPending}
          >
            {entrepreneurs.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">
                {search
                  ? `No entrepreneurs match "${search}".`
                  : tab === "REJECTED"
                  ? "No rejected entrepreneurs."
                  : "No entrepreneurs yet."}
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-left">
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
                        Rs.{entrepreneur.salesVolume.toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={entrepreneur.status} />
                      </td>
                      <td className="px-5 py-4 text-slate-400">{formatDate(entrepreneur.appliedAt)}</td>
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

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setQuery({ page })}
          />
        </main>
      </div>
    </div>
  );
}
