import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getReportSummary } from "@/lib/admin/reports";

export async function GET() {
  try {
    // Admin only: this returns platform-wide revenue and sales figures.
    // 401 = not signed in, 403 = signed in but not an admin.
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    return NextResponse.json(await getReportSummary());
  } catch (error) {
    console.error("Get reports error:", error);
    return NextResponse.json({ message: "Unable to load reports." }, { status: 500 });
  }
}
