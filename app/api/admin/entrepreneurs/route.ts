import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { parseSearchParams } from "@/lib/request-validation";
import { entrepreneurListQuerySchema, getEntrepreneurList } from "@/lib/admin/entrepreneurs";

// Same data function as the Entrepreneur Management and Registration
// Approval pages (lib/admin/entrepreneurs.ts).
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, entrepreneurListQuerySchema);
    if (query.error) return query.error;

    return NextResponse.json(await getEntrepreneurList(query.data));
  } catch (error) {
    return handleRouteError(error, "Get entrepreneurs error", { fallback: "Unable to load entrepreneurs." });
  }
}
