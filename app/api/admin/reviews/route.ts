import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { parseSearchParams } from "@/lib/request-validation";
import { getReviewsList, reviewsQuerySchema } from "@/lib/admin/content";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, reviewsQuerySchema);
    if (query.error) return query.error;

    return NextResponse.json(await getReviewsList(query.data));
  } catch (error) {
    return handleRouteError(error, "Get reviews error", { fallback: "Unable to load reviews." });
  }
}
