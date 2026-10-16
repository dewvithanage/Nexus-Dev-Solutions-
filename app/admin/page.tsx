import type { Metadata } from "next";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDashboardBody from "@/components/admin/AdminDashboardBody";
import { requireAdminPage } from "@/lib/admin/page-auth";
import { getDashboardData } from "@/lib/admin/dashboard";

export const metadata: Metadata = { title: "Admin Dashboard | StartupSpark Admin" };

// Server Component, rendered on every request (dynamic): the figures are
// live platform data for signed-in admins only, so they are never cached.
// The data is queried here directly (no API route + client-side fetch);
// the interactive parts (header search, filtering Recent Activity) live in
// AdminDashboardBody, a client component this hands the data to.
//
// The page checks the session itself instead of relying on middleware:
// middleware can only see that a cookie is validly signed, not that it was
// revoked (logout, password reset). Without this, a copied admin cookie
// could still open this page after logout and see the platform figures.
export default async function AdminDashboardPage() {
  const user = await requireAdminPage();
  const data = await getDashboardData();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminDashboardBody adminName={user.name} {...data} />
      </div>
    </div>
  );
}
