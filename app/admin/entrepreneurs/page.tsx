import type { Metadata } from "next";
import { z } from "zod";
import EntrepreneurManagementView from "@/components/admin/entrepreneurs/EntrepreneurManagementView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { getEntrepreneurList } from "@/lib/admin/entrepreneurs";
import { pageQuery } from "@/lib/request-validation";

export const metadata: Metadata = { title: "Entrepreneur Management | StartupSpark Admin" };

const querySchema = z.object({
  tab: z.enum(["ACTIVE", "REJECTED"]).default("ACTIVE"),
  search: z.string().trim().max(100).optional(),
  ...pageQuery(),
});

// Server Component, rendered on every request (dynamic): this is private
// account data that admins act on (delete), so it is never cached. The
// rows are in the first HTML response, filtered and paginated in the
// database: no loading spinner, then a second request from the browser.
export default async function EntrepreneurManagementPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireAdminPage();

  const query = readSearchParams(await searchParams, querySchema);
  const data = await getEntrepreneurList(query);

  return <EntrepreneurManagementView tab={query.tab} search={query.search ?? ""} data={data} />;
}
