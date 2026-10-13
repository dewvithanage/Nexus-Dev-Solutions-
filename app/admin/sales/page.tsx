import SalesVerificationView from "@/components/admin/sales/SalesVerificationView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { getSalesList, salesListQuerySchema } from "@/lib/admin/sales";

// Server Component, rendered on every request (dynamic): the orders are
// private, per-admin-session data that admins act on, so it must never be
// served from a cache. The data is in the first HTML response — no
// loading spinner, then a second request from the browser.
export default async function SalesVerificationPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireAdminPage();

  const query = readSearchParams(await searchParams, salesListQuerySchema);
  const status = query.status ?? "PENDING";
  const data = await getSalesList({ ...query, status });

  return <SalesVerificationView status={status} data={data} />;
}
