import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { parseSearchParams } from "@/lib/request-validation";
import { getRankings, rankingsQuerySchema } from "@/lib/admin/rankings";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, rankingsQuerySchema);
    if (query.error) return query.error;

    return NextResponse.json(await getRankings(query.data));
  } catch (error) {
    return handleRouteError(error, "Get rankings error", { fallback: "Unable to load rankings." });
  }
}
