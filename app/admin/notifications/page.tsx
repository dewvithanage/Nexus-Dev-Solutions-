import AdminNotificationsView from "@/components/admin/notifications/AdminNotificationsView";
import { requireAdminPage } from "@/lib/admin/page-auth";
import { getNotificationsFor } from "@/lib/admin/content";

// Server Component, rendered on every request (dynamic): notifications are
// private to the signed-in admin (the user id comes from the session) and
// new ones arrive at any time, so they are never cached.
export default async function AdminNotificationsPage() {
  const admin = await requireAdminPage();

  const { notifications } = await getNotificationsFor(admin.id);

  return <AdminNotificationsView notifications={notifications} />;
}
