import { notFound } from "next/navigation";
import SaleDetailsView from "@/components/admin/sales/SaleDetailsView";
import { requireAdminPage } from "@/lib/admin/page-auth";
import { getSaleDetails } from "@/lib/admin/sales";
import { idField } from "@/lib/request-validation";

// Server Component, rendered on every request (dynamic): buyer details and
// payment proof are private, and the verification status must be current
// when an admin decides to verify or flag the sale.
export default async function SalesConfirmationDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  await requireAdminPage();

  const { orderId } = await params;
  if (!idField.safeParse(orderId).success) notFound();

  const order = await getSaleDetails(orderId);
  if (!order) notFound();

  return <SaleDetailsView order={order} />;
}
