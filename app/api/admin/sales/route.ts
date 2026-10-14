import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { parseSearchParams } from "@/lib/request-validation";
import { getSalesList, salesListQuerySchema } from "@/lib/admin/sales";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, salesListQuerySchema);
    if (query.error) return query.error;

    return NextResponse.json(await getSalesList(query.data));
  } catch (error) {
    return handleRouteError(error, "Get sales error", { fallback: "Unable to load orders." });
  }
}
