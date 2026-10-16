import type { Metadata } from "next";
import { z } from "zod";
import ProductManagementView from "@/components/admin/products/ProductManagementView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { getProductList } from "@/lib/admin/products";
import { pageQuery } from "@/lib/request-validation";

export const metadata: Metadata = { title: "Product Management | StartupSpark Admin" };

const querySchema = z.object({
  tab: z.enum(["ACTIVE", "REJECTED"]).default("ACTIVE"),
  search: z.string().trim().max(100).optional(),
  ...pageQuery(),
});

// Server Component, rendered on every request (dynamic): it lists products
// in every status (including unpublished ones) and admins delete from here,
// so it is never cached. The rows are in the first HTML response, filtered
// and paginated in the database.
export default async function ProductManagementPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireAdminPage();

  const query = readSearchParams(await searchParams, querySchema);
  const data = await getProductList(query);

  return <ProductManagementView tab={query.tab} search={query.search ?? ""} data={data} />;
}
