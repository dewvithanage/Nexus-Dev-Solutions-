import type { Metadata } from "next";
import { z } from "zod";
import ProductApprovalsView from "@/components/admin/products/ProductApprovalsView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { getProductList } from "@/lib/admin/products";
import { pageQuery } from "@/lib/request-validation";

export const metadata: Metadata = { title: "Product Approvals | StartupSpark Admin" };

const querySchema = z.object({
  // ALL = every listing that isn't rejected.
  status: z.enum(["PENDING", "ALL", "APPROVED"]).default("PENDING"),
  ...pageQuery(),
});

// Server Component, rendered on every request (dynamic): new submissions
// arrive at any time and admins approve or reject them here, so the queue
// must be current and is never cached.
export default async function ProductApprovalPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireAdminPage();

  const { status, page, pageSize } = readSearchParams(await searchParams, querySchema);
  const data = await getProductList({ tab: "ACTIVE", status: status === "ALL" ? undefined : status, page, pageSize });

  return <ProductApprovalsView status={status} data={data} />;
}
