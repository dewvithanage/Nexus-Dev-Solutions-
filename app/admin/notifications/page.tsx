"use client";

import { useEffect, useState } from "react";
import { UserPlus, PackageCheck, Info, type LucideIcon } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type TabKey = "ALL" | "REGISTRATION" | "PRODUCT_ALERT";

const tabs: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All Logs" },
  { key: "REGISTRATION", label: "Registrations" },
  { key: "PRODUCT_ALERT", label: "Product Alerts" },
];

const iconsByType: Record<string, { icon: LucideIcon; style: string }> = {
  REGISTRATION: { icon: UserPlus, style: "bg-blue-50 text-blue-500" },
  PRODUCT_ALERT: { icon: PackageCheck, style: "bg-amber-50 text-amber-500" },
  SYSTEM: { icon: Info, style: "bg-slate-100 text-slate-500" },
};

// Same underlying Notification model and API as the Entrepreneur
// Notifications page (Imesha's) — this is just the admin-facing view of
// it, filtered to the logged-in admin's own notifications, with tabs
// matching what admins actually need to triage (registrations and
// product submissions). "Disputes" from the Figma isn't included since
// there's no dispute/reporting system built — see the changelog.
export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [selected, setSelected] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications);
        if (data.notifications.length > 0) setSelected(data.notifications[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((previous) => previous.map((n) => ({ ...n, isRead: true })));
  }

  async function handleSelect(notification: Notification) {
    setSelected(notification);
    if (!notification.isRead) {
      await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
      setNotifications((previous) =>
        previous.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    }
  }

  const filtered = (activeTab === "ALL" ? notifications : notifications.filter((n) => n.type === activeTab)).filter(
    (n) => {
      const term = searchTerm.trim().toLowerCase();
      return term === "" || n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term);
    }
  );

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Admin Notification Dispatch"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search notifications..."
        />

        <main className="p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                        activeTab === tab.key
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button onClick={handleMarkAllRead} className="text-xs font-semibold text-blue-600 hover:underline">
                  Mark All As Read
                </button>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading...</p>
                ) : filtered.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    No notifications here.
                  </div>
                ) : (
                  filtered.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleSelect(notification)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                        selected?.id === notification.id
                          ? "border-blue-400 bg-white"
                          : notification.isRead
                          ? "border-slate-200 bg-white"
                          : "border-blue-200 bg-blue-50/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{notification.message}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="h-fit rounded-xl border border-slate-200 bg-white p-5">
              {!selected ? (
                <p className="text-sm text-slate-500">Select a notification to see details.</p>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {selected.type.replace("_", " ")}
                  </p>
                  <h2 className="mt-1 text-base font-bold text-slate-900">{selected.title}</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(selected.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-sm text-slate-600">{selected.message}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
