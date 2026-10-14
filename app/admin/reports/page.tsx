import ReportsView from "@/components/admin/reports/ReportsView";
import { requireAdminPage } from "@/lib/admin/page-auth";
import { getReportSummary } from "@/lib/admin/reports";

// Server Component, rendered per request (dynamic) because it checks the
// admin session. The platform totals come from the Data Cache
// (lib/admin/reports.ts): the same for every admin, cleared as soon as a
// sale is verified or flagged, and refreshed at least every minute.
export default async function ReportsAnalyticsPage() {
  await requireAdminPage();

  const report = await getReportSummary();

  return <ReportsView report={report} />;
}
