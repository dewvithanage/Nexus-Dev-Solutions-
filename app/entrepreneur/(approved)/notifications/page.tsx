import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import NotificationCenter from "@/components/entrepreneur/NotificationCenter";
import { getOwnNotifications, requireEntrepreneurPage } from "@/lib/entrepreneur-data";

// Server Component: the signed-in seller's notifications are read on the
// server, so the list is in the page when it arrives instead of being
// fetched from /api/notifications afterwards. Rendered on every request.
// Tabs and "mark as read" stay interactive in NotificationCenter.
export default async function NotificationsPage() {
  const { user, sidebar } = await requireEntrepreneurPage();
  const notifications = await getOwnNotifications(user.id);

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row bg-[#F5F7FA]">
      <Sidebar entrepreneur={sidebar} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Notification Center" />

        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6">
          <NotificationCenter
            initialNotifications={notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
          />
        </main>
      </div>
    </div>
  );
}
