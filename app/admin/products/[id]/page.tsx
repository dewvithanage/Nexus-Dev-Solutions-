"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type ProductDetails = {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  category: { id: string; name: string };
  images: { id: string; url: string }[];
  business: {
    businessName: string;
    entrepreneurProfile: { university: string | null; user: { name: string } };
  };
};

type CategoryOption = { id: string; name: string };

export default function AdminProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [categorySaved, setCategorySaved] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => setCategories(data.categories || []));
  }, []);

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadProduct() {
    try {
      const response = await fetch(`/api/admin/products/${params.id}`);
      const data = await response.json();
      if (response.ok) {
        setProduct(data.product);
        setNotes(data.product.adminNotes || "");
        setSelectedCategoryId(data.product.category.id);
      }
    } catch (error) {
      console.error("Load product details error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: "approve" | "reject") {
    if (action === "reject") {
      const reason = window.prompt("Reason for rejecting this product (optional):") || undefined;
      setActionLoading(true);
      await fetch(`/api/admin/products/${params.id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });
    } else {
      setActionLoading(true);
      await fetch(`/api/admin/products/${params.id}/approve`, { method: "PATCH" });
    }
    await loadProduct();
    setActionLoading(false);
  }

  async function handleSaveNotes() {
    await fetch(`/api/admin/products/${params.id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNotes: notes }),
    });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  // NEW: lets an admin move this product to a different category
  // directly — mainly useful for clearing a category out before
  // deleting it, without needing the entrepreneur to do it themselves.
  async function handleSaveCategory() {
    if (!selectedCategoryId || selectedCategoryId === product?.category.id) return;

    setCategorySaving(true);
    try {
      const response = await fetch(`/api/admin/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedCategoryId }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to update category.");
        return;
      }

      await loadProduct();
      setCategorySaved(true);
      setTimeout(() => setCategorySaved(false), 2000);
    } catch (error) {
      console.error("Change category error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setCategorySaving(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Product Submission Audit" notificationsHref="/admin/notifications" />

        <main className="p-8">
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : !product ? (
            <p className="text-sm text-red-500">Product not found.</p>
          ) : (
            <>
              {/* Status banner + actions */}
              <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-6 py-4">
                <div>
                  <p className="text-sm font-bold text-blue-700">
                    {product.status === "PENDING"
                      ? "Awaiting Moderator Review"
                      : product.status === "APPROVED"
                      ? "Approved & Published"
                      : "Rejected"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Submitted by {product.business.entrepreneurProfile.user.name}
                    {product.business.entrepreneurProfile.university &&
                      ` (${product.business.entrepreneurProfile.university})`}{" "}
                    on {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {product.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction("reject")}
                      disabled={actionLoading}
                      className="rounded-md bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                    >
                      Reject Submission
                    </button>
                    <button
                      onClick={() => handleAction("approve")}
                      disabled={actionLoading}
                      className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      Approve & Publish
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-bold text-slate-900">Submitted Assets</h3>
                    {product.images.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500">No images uploaded yet.</p>
                    ) : (
                      <div className="mt-3 flex gap-3">
                        {product.images.map((image) => (
                          <div key={image.id} className="h-24 w-24 overflow-hidden rounded-md bg-slate-100">
                            <img src={image.url} alt={product.name} className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-6">
                    <h3 className="text-sm font-bold text-slate-900">Product Details & Specifications</h3>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Venture Item Name</p>
                        <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Proposed Price</p>
                        <p className="text-sm font-bold text-blue-600">
                          Rs.{Number(product.price).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Category</p>
                        <div className="mt-1 flex items-center gap-2">
                          <select
                            value={selectedCategoryId}
                            onChange={(event) => setSelectedCategoryId(event.target.value)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800"
                          >
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          {selectedCategoryId !== product.category.id && (
                            <button
                              onClick={handleSaveCategory}
                              disabled={categorySaving}
                              className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {categorySaving ? "Saving..." : "Save"}
                            </button>
                          )}
                          {categorySaved && <span className="text-[10px] text-emerald-600">Saved!</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Initial Inventory</p>
                        <p className="text-sm font-semibold text-slate-800">{product.stockQuantity}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-slate-400">Product Description</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{product.description}</p>
                    </div>
                    {product.rejectionReason && (
                      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                        <p className="text-xs text-red-500">Rejection Reason</p>
                        <p className="text-sm text-red-700">{product.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Simplified from the Figma: no fake "Automated Safety
                      Pass" step since no such system exists — just the
                      real timestamps we actually have. */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-slate-900">Submission Timeline</h3>
                    <div className="mt-4 space-y-4">
                      <div className="flex gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Initial Submission</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(product.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            product.reviewedAt ? "bg-blue-500" : "bg-amber-400"
                          }`}
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {product.reviewedAt ? "Reviewed" : "Pending Manual Review"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {product.reviewedAt
                              ? new Date(product.reviewedAt).toLocaleString()
                              : "Waiting for an admin"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-slate-900">Admin Audit Notes</h3>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Enter internal moderator reasons, flag logs, or change suggestions here..."
                      className="mt-3 h-24 w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleSaveNotes}
                      className="mt-3 w-full rounded-md bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      {notesSaved ? "Saved!" : "Save Internal Notes"}
                    </button>
                  </div>
                </div>
              </div>

              <Link
                href="/admin/products"
                className="mt-6 inline-block text-xs font-semibold text-blue-600 hover:underline"
              >
                ← Back to Venture Directory
              </Link>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
