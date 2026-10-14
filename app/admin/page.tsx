import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboardBody from "@/components/admin/AdminDashboardBody";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// This stays a Server Component (no "use client") so it can query Prisma
// directly — no need for an API route + client-side fetch just to show
// some numbers. All the interactive parts (the header's search box,
// filtering Recent Activity) now live in AdminDashboardBody, a client
// component this just hands the already-fetched data to.
//
// The page checks the session itself instead of relying on middleware:
// middleware can only see that a cookie is validly signed, not that it was
// revoked (logout, password reset). Without this, a copied admin cookie
// could still open this page after logout and see the platform figures.
export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  const [
    totalEntrepreneurs,
    pendingEntrepreneurs,
    pendingProducts,
    activeProducts,
    ordersCount,
    verifiedSales,
    recentEntrepreneurs,
    recentProducts,
  ] = await Promise.all([
    prisma.entrepreneurProfile.count(),
    prisma.entrepreneurProfile.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "APPROVED" } }),
    prisma.order.count({ where: { status: { not: "CANCELLED" } } }),
    // Only admin-verified sales count as revenue, the same rule Reports and
    // Rankings use, so the numbers agree across pages.
    prisma.order.aggregate({ where: { status: "VERIFIED" }, _sum: { totalAmount: true } }),
    prisma.entrepreneurProfile.findMany({
      take: 5,
      orderBy: { appliedAt: "desc" },
      include: { user: { select: { name: true } }, business: true },
    }),
    prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { business: true },
    }),
  ]);

  const totalSalesVolume = Number(verifiedSales._sum.totalAmount ?? 0);

  // Combine the two "recent activity" lists into one, sorted newest first.
  // This is a simple stand-in for a real audit log — Sprint 2 could add a
  // dedicated ActivityLog table later if the team wants a proper history.
  const activity = [
    ...recentEntrepreneurs.map((entrepreneur) => ({
      type: "Registration",
      name: entrepreneur.user.name,
      description: `Applied for "${entrepreneur.business?.businessName ?? "their business"}"`,
      status: entrepreneur.status,
      date: entrepreneur.appliedAt,
    })),
    ...recentProducts.map((product) => ({
      type: "Product Submit",
      name: product.business.businessName,
      description: `Submitted "${product.name}"`,
      status: product.status,
      date: product.createdAt,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
    // Drop the raw Date object before handing this to the client
    // component — only plain, JSON-serializable data can cross from a
    // Server Component into a Client Component as props.
    .map(({ date, ...rest }) => rest);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminDashboardBody
          adminName={user.name}
          totalEntrepreneurs={totalEntrepreneurs}
          pendingEntrepreneurs={pendingEntrepreneurs}
          pendingProducts={pendingProducts}
          activeProducts={activeProducts}
          totalSalesVolume={totalSalesVolume}
          ordersCount={ordersCount}
          activity={activity}
        />
      </div>
    </div>
  );
}
