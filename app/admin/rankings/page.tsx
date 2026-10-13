import RankingsView from "@/components/admin/rankings/RankingsView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { getRankings, rankingsQuerySchema } from "@/lib/admin/rankings";

// Server Component, rendered per request (dynamic) because it checks the
// admin session. The ranking totals themselves come from the Data Cache
// (lib/admin/rankings.ts): they are the same for every admin, and are
// cleared as soon as a sale is verified or flagged.
export default async function EntrepreneurRankingsPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireAdminPage();

  const query = readSearchParams(await searchParams, rankingsQuerySchema);
  const data = await getRankings(query);

  return <RankingsView period={query.period} data={data} />;
}
