import type { Metadata } from "next";
import { z } from "zod";
import EntrepreneurApprovalsView from "@/components/admin/entrepreneurs/EntrepreneurApprovalsView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { countPendingEntrepreneurs, getEntrepreneurList } from "@/lib/admin/entrepreneurs";
import { pageQuery } from "@/lib/request-validation";

export const metadata: Metadata = { title: "Registration Approvals | StartupSpark Admin" };

const querySchema = z.object({
  // ALL = every application that isn't rejected (pending + approved).
  status: z.enum(["PENDING", "ALL", "REJECTED"]).default("PENDING"),
  ...pageQuery(),
});

// Server Component, rendered on every request (dynamic): new registrations
// arrive at any time and admins decide on them here, so the queue must be
// current and is never cached.
export default async function EntrepreneurRegistrationApprovalPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await requireAdminPage();

  const { status, page, pageSize } = readSearchParams(await searchParams, querySchema);

  // Independent queries, run in parallel.
  const [data, pendingCount] = await Promise.all([
    getEntrepreneurList({ tab: "ACTIVE", status: status === "ALL" ? undefined : status, page, pageSize }),
    countPendingEntrepreneurs(),
  ]);

  return <EntrepreneurApprovalsView status={status} pendingCount={pendingCount} data={data} />;
}
