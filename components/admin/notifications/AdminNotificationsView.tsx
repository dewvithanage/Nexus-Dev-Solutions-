"use client";

import { useState } from "react";
import { UserPlus, PackageCheck, Info, type LucideIcon } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import { formatDateTime } from "@/lib/format-date";
import type { NotificationsList } from "@/lib/admin/content";

type Notification = NotificationsList["notifications"][number];
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
// Notifications page (Imesha's) — this is the admin-facing view of it,
// showing only the signed-in admin's own notifications, with tabs matching
// what admins need to triage (registrations and product submissions).
// "Disputes" from the Figma isn't included since there's no
// dispute/reporting system built — see the changelog.
//
// The notifications arrive already loaded from the server. Marking as read
// updates the screen straight away and saves in the background; if saving
// fails, the page is reloaded from the server so it shows the real state.
export default function AdminNotificationsView({ notifications }: { notifications: Notification[] }) {
  const { refresh } = useQueryNavigation();
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(notifications[0]?.id ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [allRead, setAllRead] = useState(false);
  const [error, setError] = useState("");

  const isRead = (n: Notification) => n.isRead || allRead || readIds.has(n.id);
  const selected = notifications.find((n) => n.id === selectedId) ?? null;

  async function save(url: string, undo: () => void) {
    try {
      const response = await fetch(url, { method: "PATCH" });
      if (!response.ok) throw new Error(`${response.status}`);
    } catch {
      undo();
      setError("Couldn't save that change. Showing the latest saved notifications.");
      refresh();
    }
  }

  function handleMarkAllRead() {
    setError("");
    setAllRead(true);
    save("/api/notifications", () => setAllRead(false));
  }

  function handleSelect(notification: Notification) {
    setSelectedId(notification.id);
    if (isRead(notification)) return;
    setError("");
    setReadIds((previous) => new Set(previous).add(notification.id));
    save(`/api/notifications/${notification.id}`, () =>
      setReadIds((previous) => {
        const next = new Set(previous);
        next.delete(notification.id);
        return next;
      })
    );
  }

  const term = searchTerm.trim().toLowerCase();
  const filtered = notifications
    .filter((n) => activeTab === "ALL" || n.type === activeTab)
    .filter((n) => term === "" || n.title.toLowerCase().includes(term) || n.message.toLowerCase().includes(term));

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
          {error && (
            <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      aria-current={activeTab === tab.key ? "page" : undefined}
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
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                    No notifications here.
                  </div>
                ) : (
                  filtered.map((notification) => {
                    const read = isRead(notification);
                    const { icon: Icon, style } = iconsByType[notification.type] ?? iconsByType.SYSTEM;
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleSelect(notification)}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                          selectedId === notification.id
                            ? "border-blue-400 bg-white"
                            : read
                            ? "border-slate-200 bg-white"
                            : "border-blue-200 bg-blue-50/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style}`}>
                            <Icon size={15} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{notification.message}</p>
                          </div>
                        </div>
                        {!read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="h-fit rounded-xl border border-slate-200 bg-white p-5">
              {!selected ? (
                <p className="text-sm text-slate-500">Select a notification to see details.</p>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {selected.type.replace(/_/g, " ")}
                  </p>
                  <h2 className="mt-1 text-base font-bold text-slate-900">{selected.title}</h2>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(selected.createdAt)}</p>
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
