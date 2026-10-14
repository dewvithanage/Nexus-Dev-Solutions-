"use client";

import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import Pagination from "@/components/admin/Pagination";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import { formatDate } from "@/lib/format-date";
import type { EntrepreneurList } from "@/lib/admin/entrepreneurs";

export type ApprovalTab = "PENDING" | "ALL" | "REJECTED";

const tabs: { key: ApprovalTab; label: string }[] = [
  { key: "ALL", label: "All Applications" },
  { key: "PENDING", label: "Pending Approvals" },
  { key: "REJECTED", label: "Archived / Rejected" },
];

// The interactive part of Entrepreneur Registration Approval. The
// applications arrive already loaded from the server
// (app/admin/entrepreneurs/approvals/page.tsx); changing tab or page
// updates the URL, which asks the server for that data.
export default function EntrepreneurApprovalsView({
  status,
  pendingCount,
  data,
}: {
  status: ApprovalTab;
  // Every pending application in the database, not just this page's.
  pendingCount: number;
  data: EntrepreneurList;
}) {
  const { entrepreneurs, pagination } = data;
  const { isPending, setQuery } = useQueryNavigation();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Pending Registrations Queue" notificationsHref="/admin/notifications" />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setQuery({ status: tab.key === "PENDING" ? null : tab.key, page: null })}
                aria-current={status === tab.key ? "page" : undefined}
                className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                  status === tab.key
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
                {tab.key === "PENDING" && pendingCount > 0 ? ` (${pendingCount})` : ""}
              </button>
            ))}
          </div>

          <p className="mb-3 text-xs text-slate-500" aria-live="polite">
            {isPending ? "Updating..." : `Showing ${entrepreneurs.length} of ${pagination.totalCount}`}
          </p>

          <div
            className={`overflow-x-auto rounded-xl border border-slate-200 bg-white transition-opacity ${
              isPending ? "opacity-50" : ""
            }`}
            aria-busy={isPending}
          >
            {entrepreneurs.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">
                {status === "PENDING"
                  ? "No applications are waiting for review. New registrations will appear here."
                  : "No applications in this category."}
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-left">
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
                      <td className="px-5 py-4 text-slate-400">{formatDate(entrepreneur.appliedAt)}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{entrepreneur.fullName}</td>
                      <td className="px-5 py-4">{entrepreneur.university || "—"}</td>
                      <td className="px-5 py-4 font-medium text-blue-600">{entrepreneur.businessName}</td>
                      <td className="px-5 py-4">{entrepreneur.primaryCategory}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={entrepreneur.status} />
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
