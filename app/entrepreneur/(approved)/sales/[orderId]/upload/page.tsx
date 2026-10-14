import Link from "next/link";
import { notFound } from "next/navigation";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import SalesProofForm from "@/components/entrepreneur/SalesProofForm";
import { getOwnOrderForProof, requireEntrepreneurPage } from "@/lib/entrepreneur-data";

const OPEN_STATUSES = ["PENDING", "AWAITING_FULFILLMENT"];

// Server Component: checks on the server, before showing the form, that the
// order belongs to the signed-in seller (otherwise 404) and still accepts
// proof. Previously the form appeared for any order id and only failed
// after the photo had been chosen and submitted. The API route checks all
// of this again when the form is sent.
export default async function UploadSalesConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { business, sidebar } = await requireEntrepreneurPage();

  const order = await getOwnOrderForProof(orderId, business.id);
  if (!order) notFound();

  if (order.salesConfirmation || !OPEN_STATUSES.includes(order.status)) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden lg:flex-row bg-[#F5F7FA]">
        <Sidebar entrepreneur={sidebar} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader title="Sales Fulfillment Desk" />
          <main className="flex-1 overflow-auto px-4 py-5 sm:px-6">
            <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
              <h1 className="text-base font-bold text-slate-900">Proof can&apos;t be added to this order</h1>
              <p className="mt-2 text-sm text-slate-500">
                {order.salesConfirmation
                  ? "Proof has already been submitted for this order and is with the admin."
                  : `This order is ${order.status.toLowerCase().replace(/_/g, " ")}, so it no longer accepts proof.`}
              </p>
              <Link
                href="/entrepreneur/orders"
                className="mt-5 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Back to orders
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return <SalesProofForm orderId={order.id} sidebar={sidebar} />;
}
