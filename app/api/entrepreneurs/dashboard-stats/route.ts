import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEntrepreneur, handleRouteError } from "@/lib/api-auth";
import { getEntrepreneurDashboardStats } from "@/lib/entrepreneur-dashboard";
import { parseSearchParams } from "@/lib/request-validation";

const querySchema = z.object({}).strict();

export async function GET(request: NextRequest) {
  try {
    const auth = await requireEntrepreneur();
    if (auth.error) return auth.error;
    // This endpoint never accepts a caller-provided owner or business ID.
    const parsed = parseSearchParams(request, querySchema);
    if (parsed.error) return parsed.error;
    const stats = await getEntrepreneurDashboardStats(auth.business.id);
    return NextResponse.json(stats, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, "Dashboard statistics error", {
      fallback: "Unable to load dashboard statistics.",
    });
  }
}
