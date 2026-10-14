import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, requireAdmin } from "@/lib/api-auth";
import { parseSearchParams } from "@/lib/request-validation";
import { getProductList, productListQuerySchema } from "@/lib/admin/products";

// Same data function as the Product Management and Product Approval pages
// (lib/admin/products.ts).
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const query = parseSearchParams(request, productListQuerySchema);
    if (query.error) return query.error;

    return NextResponse.json(await getProductList(query.data));
  } catch (error) {
    return handleRouteError(error, "Get products error", { fallback: "Unable to load products." });
  }
}
