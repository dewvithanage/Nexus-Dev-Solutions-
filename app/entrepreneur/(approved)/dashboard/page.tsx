import { Suspense } from "react";
import PageSkeleton from "@/components/public/PageSkeleton";
import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import DashboardBody from "@/components/entrepreneur/dashboard/DashboardBody";
import RecentOrders from "@/components/entrepreneur/dashboard/RecentOrders";
import Notifications from "@/components/entrepreneur/dashboard/Notifications";
import { requireEntrepreneurPage } from "@/lib/entrepreneur-data";
import { getEntrepreneurDashboardStats } from "@/lib/entrepreneur-dashboard";

export const metadata = { title: "Entrepreneur Dashboard | StartupSpark" };

export default async function EntrepreneurDashboardPage() {
  const { user, business, sidebar } = await requireEntrepreneurPage();
  const businessId = business.id;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <Sidebar entrepreneur={sidebar} />
      <div className="min-w-0 flex-1">
        <DashboardHeader />
        <Suspense fallback={<PageSkeleton />}>
          <DashboardContent businessId={businessId} name={user.name} userId={user.id} />
        </Suspense>
      </div>
    </div>
  );
}

async function DashboardContent({ businessId, name, userId }: { businessId: string; name: string; userId: string }) {
  const stats = await getEntrepreneurDashboardStats(businessId);
  return <DashboardBody name={name} initialStats={stats}>
    <Suspense fallback={<PageSkeleton />}><RecentOrders businessId={businessId} /></Suspense>
    <Suspense fallback={<PageSkeleton />}><Notifications userId={userId} /></Suspense>
  </DashboardBody>;
}
