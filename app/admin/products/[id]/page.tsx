import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import {
  AdminNotesForm,
  CategorySelect,
  ProductDecisionButtons,
} from "@/components/admin/products/ProductModerationControls";
import { requireAdminPage } from "@/lib/admin/page-auth";
import { getCategoryOptions, getProductDetails } from "@/lib/admin/products";
import { formatDate, formatDateTime } from "@/lib/format-date";
import { idField } from "@/lib/request-validation";

type Props = { params: Promise<{ id: string }> };

const statusHeading = {
  PENDING: "Awaiting Moderator Review",
  APPROVED: "Approved & Published",
  REJECTED: "Rejected",
  DRAFT: "Draft (not submitted)",
} as const;

// Tab title names the product. Shares the page's query (getProductDetails
// is cached per request) and checks the session first.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdminPage();
  const { id } = await params;
  const product = idField.safeParse(id).success ? await getProductDetails(id) : null;
  return { title: `${product ? product.name : "Product not found"} | StartupSpark Admin` };
}

// Server Component, rendered on every request (dynamic): internal notes are
// admin-only, and the status must be current when an admin decides to
// approve or reject.
export default async function AdminProductDetailsPage({ params }: Props) {
  await requireAdminPage();

  const { id } = await params;
  if (!idField.safeParse(id).success) notFound();

  // Independent queries, run in parallel.
  const [product, categories] = await Promise.all([getProductDetails(id), getCategoryOptions()]);
  if (!product) notFound();

  const seller = product.business.entrepreneurProfile;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Product Submission Audit" notificationsHref="/admin/notifications" />

        <main className="p-4 sm:p-6 lg:p-8">
          {/* Status banner + actions */}
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-bold text-blue-700">{statusHeading[product.status]}</p>
              <p className="text-xs text-slate-500">
                Submitted by {seller.user.name}
                {seller.university && ` (${seller.university})`} on {formatDate(product.createdAt)}
              </p>
            </div>

            {product.status === "PENDING" && <ProductDecisionButtons productId={product.id} />}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-bold text-slate-900">Submitted Assets</h3>
                {product.images.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">No images uploaded yet.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {product.images.map((image, index) => (
                      <div key={image.id} className="relative h-24 w-24 overflow-hidden rounded-md bg-slate-100">
                        <Image
                          src={image.url}
                          alt={`${product.name} image ${index + 1}`}
                          fill
                          sizes="96px"
                          // The first image is the largest thing above the
                          // fold on a phone, so it isn't lazy-loaded.
                          priority={index === 0}
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-bold text-slate-900">Product Details & Specifications</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">Venture Item Name</p>
                    <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Proposed Price</p>
                    <p className="text-sm font-bold text-blue-600">Rs.{product.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Category</p>
                    <CategorySelect
                      productId={product.id}
                      currentCategoryId={product.category.id}
                      categories={categories}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Initial Inventory</p>
                    <p className="text-sm font-semibold text-slate-800">{product.stockQuantity}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-400">Product Description</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{product.description}</p>
                </div>
                {product.rejectionReason && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="text-xs text-red-500">Rejection Reason</p>
                    <p className="text-sm text-red-700">{product.rejectionReason}</p>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-5">
              {/* Only the real timestamps we have; no invented review steps. */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">Submission Timeline</h3>
                <ol className="mt-4 space-y-4">
                  <li className="flex gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Initial Submission</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(product.createdAt)}</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
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
                        {product.reviewedAt ? formatDateTime(product.reviewedAt) : "Waiting for an admin"}
                      </p>
                    </div>
                  </li>
                </ol>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900">Admin Audit Notes</h3>
                <AdminNotesForm productId={product.id} initialNotes={product.adminNotes ?? ""} />
              </section>
            </div>
          </div>

          <Link href="/admin/products" className="mt-6 inline-block text-xs font-semibold text-blue-600 hover:underline">
            ← Back to Venture Directory
          </Link>
        </main>
      </div>
    </div>
  );
}
