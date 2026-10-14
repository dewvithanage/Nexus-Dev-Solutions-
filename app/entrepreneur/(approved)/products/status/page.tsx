import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import ProductStatusTabs from "@/components/entrepreneur/ProductStatusTabs";
import { getOwnProducts, requireEntrepreneurPage } from "@/lib/entrepreneur-data";

// Server Component: the seller's submissions are read on the server, so the
// list is in the page when it arrives (no /api/products request from the
// browser, no "Loading..." flash). Rendered on every request, so a decision
// an admin just made shows up immediately. Only the tab filtering runs in
// the browser (ProductStatusTabs).
export default async function ProductSubmissionStatusPage() {
  const { business, sidebar } = await requireEntrepreneurPage();
  const products = await getOwnProducts(business.id);

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row bg-[#F5F7FA]">
      <Sidebar entrepreneur={sidebar} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Product Submission Status" />

        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6">
          <ProductStatusTabs
            products={products.map((product) => ({
              id: product.id,
              name: product.name,
              status: product.status,
              rejectionReason: product.rejectionReason,
              submittedOn: product.createdAt.toLocaleDateString("en-GB", { timeZone: "Asia/Colombo" }),
              imageUrl: product.images[0]?.url ?? null,
            }))}
          />
        </main>
      </div>
    </div>
  );
}
