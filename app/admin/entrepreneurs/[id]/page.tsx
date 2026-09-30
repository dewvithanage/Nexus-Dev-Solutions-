"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type EntrepreneurDetails = {
  id: string;
  university: string | null;
  studentId: string | null;
  bio: string | null;
  whatsappNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  user: { name: string; email: string; phone: string | null };
  business: {
    businessName: string;
    description: string | null;
    products: { id: string; name: string; category: { name: string } }[];
  } | null;
};

// This page is used both as the "View" destination from the Registration
// Approval queue AND from the Entrepreneur Management directory — same
// details, same actions, just reached from two different lists.
export default function EntrepreneurDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [entrepreneur, setEntrepreneur] = useState<EntrepreneurDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadDetails() {
    try {
      const response = await fetch(`/api/admin/entrepreneurs/${params.id}`);
      const data = await response.json();
      if (response.ok) setEntrepreneur(data.entrepreneur);
    } catch (error) {
      console.error("Load entrepreneur details error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/entrepreneurs/${params.id}/approve`, {
        method: "PATCH",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Unable to approve.");
        return;
      }
      await loadDetails();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    const reason = window.prompt("Reason for rejecting this application (optional):") || undefined;
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/entrepreneurs/${params.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Unable to reject.");
        return;
      }
      await loadDetails();
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <div className="flex h-[46px] items-center justify-between border-b border-[#E2E8F0] bg-white px-5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Reviewing Application {entrepreneur ? `— ${entrepreneur.user.name}` : ""}
          </button>

          {entrepreneur?.status === "PENDING" && (
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="rounded-md bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                Reject Business
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                Approve & Activate
              </button>
            </div>
          )}
        </div>

        <main className="p-8">
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : !entrepreneur ? (
            <p className="text-sm text-red-500">Entrepreneur not found.</p>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
                {/* Profile card */}
                <div className="h-fit rounded-xl border border-slate-200 bg-white p-6 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                    {entrepreneur.user.name.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="mt-3 text-base font-bold text-slate-900">
                    {entrepreneur.user.name}
                  </h2>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-[10px] font-semibold ${
                      entrepreneur.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-600"
                        : entrepreneur.status === "REJECTED"
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    {entrepreneur.status}
                  </span>

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-left text-xs">
                    <div>
                      <p className="text-slate-400">Faculty / University</p>
                      <p className="font-medium text-slate-800">{entrepreneur.university || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Email</p>
                      <p className="font-medium text-slate-800">{entrepreneur.user.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Phone Number</p>
                      <p className="font-medium text-slate-800">
                        {entrepreneur.user.phone || entrepreneur.whatsappNumber || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Student ID</p>
                      <p className="font-medium text-slate-800">{entrepreneur.studentId || "—"}</p>
                    </div>
                    {entrepreneur.rejectionReason && (
                      <div>
                        <p className="text-slate-400">Rejection Reason</p>
                        <p className="font-medium text-red-600">{entrepreneur.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business overview */}
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-bold text-slate-900">Proposed Venture Overview</h3>

                    <div className="mt-4">
                      <p className="text-xs text-slate-400">Venture / Brand Name</p>
                      <p className="text-base font-bold text-blue-600">
                        {entrepreneur.business?.businessName || "—"}
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-slate-400">Venture Description</p>
                      <p className="text-sm text-slate-700">
                        {entrepreneur.business?.description || "No description provided yet."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-bold text-slate-900">
                      Submitted Products ({entrepreneur.business?.products.length ?? 0})
                    </h3>

                    {!entrepreneur.business?.products.length ? (
                      <p className="mt-3 text-xs text-slate-500">No products submitted yet.</p>
                    ) : (
                      <ul className="mt-3 divide-y divide-slate-100">
                        {entrepreneur.business.products.map((product) => (
                          <li key={product.id} className="flex justify-between py-2 text-xs">
                            <span className="font-medium text-slate-800">{product.name}</span>
                            <span className="text-slate-400">{product.category.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href="/admin/entrepreneurs"
                className="mt-6 inline-block text-xs font-semibold text-blue-600 hover:underline"
              >
                ← Back to Entrepreneur Directory
              </Link>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
