import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import StatusBadge from "@/components/admin/StatusBadge";
import EntrepreneurDecisionBar from "@/components/admin/entrepreneurs/EntrepreneurDecisionBar";
import { requireAdminPage } from "@/lib/admin/page-auth";
import { getEntrepreneurDetails } from "@/lib/admin/entrepreneurs";
import { idField } from "@/lib/request-validation";

type Props = { params: Promise<{ id: string }> };

// Tab title names the business under review. Shares the page's query
// (getEntrepreneurDetails is cached per request) and checks the session
// first, so nothing is looked up for a visitor who isn't an admin.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdminPage();
  const { id } = await params;
  const entrepreneur = idField.safeParse(id).success ? await getEntrepreneurDetails(id) : null;
  return {
    title: entrepreneur
      ? `${entrepreneur.business?.businessName ?? entrepreneur.user.name} | StartupSpark Admin`
      : "Entrepreneur not found | StartupSpark Admin",
  };
}

// Server Component, rendered on every request (dynamic): the applicant's
// contact details are private, and the status must be current when an
// admin decides to approve or reject. Used from both the Registration
// Approval queue and the Entrepreneur Management directory.
export default async function EntrepreneurDetailsPage({ params }: Props) {
  await requireAdminPage();

  const { id } = await params;
  if (!idField.safeParse(id).success) notFound();

  const entrepreneur = await getEntrepreneurDetails(id);
  if (!entrepreneur) notFound();

  const products = entrepreneur.business?.products ?? [];
  const productTotal = entrepreneur.business?._count.products ?? 0;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <EntrepreneurDecisionBar
          entrepreneurId={entrepreneur.id}
          name={entrepreneur.user.name}
          status={entrepreneur.status}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
            {/* Profile card */}
            <div className="h-fit rounded-xl border border-slate-200 bg-white p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                {entrepreneur.user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="mt-3 text-base font-bold text-slate-900">{entrepreneur.user.name}</h2>
              <StatusBadge status={entrepreneur.status} className="mt-2 inline-block text-[10px]" />

              <dl className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-left text-xs">
                <Detail label="Faculty / University" value={entrepreneur.university} />
                <Detail label="Email" value={entrepreneur.user.email} breakAll />
                <Detail label="Phone Number" value={entrepreneur.user.phone || entrepreneur.whatsappNumber} />
                <Detail label="Student ID" value={entrepreneur.studentId} />
                {entrepreneur.rejectionReason && (
                  <div>
                    <dt className="text-slate-500">Rejection Reason</dt>
                    <dd className="font-medium text-red-600">{entrepreneur.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Business overview */}
            <div className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-bold text-slate-900">Proposed Venture Overview</h3>

                <div className="mt-4">
                  <p className="text-xs text-slate-500">Venture / Brand Name</p>
                  <p className="text-base font-bold text-blue-600">{entrepreneur.business?.businessName || "—"}</p>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500">Venture Description</p>
                  <p className="text-sm text-slate-700">
                    {entrepreneur.business?.description || "No description provided yet."}
                  </p>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-bold text-slate-900">Submitted Products ({productTotal})</h3>

                {products.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-500">No products submitted yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100">
                    {products.map((product) => (
                      <li key={product.id} className="flex justify-between gap-3 py-2 text-xs">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="font-medium text-slate-800 hover:text-blue-600"
                        >
                          {product.name}
                        </Link>
                        <span className="text-slate-500">{product.category.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {productTotal > products.length && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Showing the latest {products.length} of {productTotal}.
                  </p>
                )}
              </section>
            </div>
          </div>

          <Link
            href="/admin/entrepreneurs"
            className="mt-6 inline-block text-xs font-semibold text-blue-600 hover:underline"
          >
            ← Back to Entrepreneur Directory
          </Link>
        </main>
      </div>
    </div>
  );
}

function Detail({ label, value, breakAll }: { label: string; value: string | null; breakAll?: boolean }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium text-slate-800 ${breakAll ? "break-all" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
