import { NextRequest, NextResponse } from "next/server";
import { handleRouteError, jsonError, requireAdmin } from "@/lib/api-auth";
import { idField } from "@/lib/request-validation";
import { getSaleDetails } from "@/lib/admin/sales";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Admin only: this returns buyer details and payment proof.
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { orderId } = await params;
    if (!idField.safeParse(orderId).success) return jsonError(404, "Order not found.");

    const order = await getSaleDetails(orderId);
    if (!order) {
      return jsonError(404, "Order not found.");
    }

    return NextResponse.json({ order });
  } catch (error) {
    return handleRouteError(error, "Get order details error", { fallback: "Unable to load order." });
  }
}
