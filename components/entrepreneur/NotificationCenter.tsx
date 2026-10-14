"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, MessageCircle, DollarSign, Clock3, type LucideIcon } from "lucide-react";

export type CenterNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type TabKey = "ALL" | "ORDER" | "PRODUCT" | "SYSTEM";

const tabs: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All Notifications" },
  { key: "ORDER", label: "Orders" },
  { key: "PRODUCT", label: "Products" },
  { key: "SYSTEM", label: "System" },
];

const iconsByType: Record<string, { icon: LucideIcon; style: string }> = {
  ORDER: { icon: MessageCircle, style: "bg-amber-50 text-amber-500" },
  PRODUCT: { icon: CircleCheck, style: "bg-blue-50 text-blue-500" },
  SALES: { icon: DollarSign, style: "bg-emerald-50 text-emerald-500" },
  SYSTEM: { icon: Clock3, style: "bg-slate-100 text-slate-500" },
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Interactive part of the Notification Center (tabs, mark as read). It
// starts from the list the page loaded on the server, so nothing is fetched
// when the page opens.
export default function NotificationCenter({ initialNotifications }: { initialNotifications: CenterNotification[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  // The list is only updated once the server has saved the change, so the
  // page never shows something as read that is still unread in the database.
  // router.refresh() then drops the browser's cached copies of other pages
  // (e.g. the dashboard's notification list), so they aren't stale either.
  async function handleMarkOneRead(id: string) {
    setError("");
    const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => null);
    if (!response?.ok) {
      setError(
        response?.status === 401
          ? "Your session has expired. Please sign in again."
          : "Unable to mark the notification as read."
      );
      return;
    }
    setNotifications((previous) => previous.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    router.refresh();
  }

  async function handleMarkAllRead() {
    setError("");
    setMarkingAll(true);
    const response = await fetch("/api/notifications", { method: "PATCH" }).catch(() => null);
    setMarkingAll(false);
    if (!response?.ok) {
      setError(
        response?.status === 401
          ? "Your session has expired. Please sign in again."
          : "Unable to mark notifications as read."
      );
      return;
    }
    setNotifications((previous) => previous.map((n) => ({ ...n, isRead: true })));
    router.refresh();
  }

  const filtered = activeTab === "ALL" ? notifications : notifications.filter((n) => n.type === activeTab);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const countByType = (type: TabKey) =>
    type === "ALL" ? unreadCount : notifications.filter((n) => n.type === type && !n.isRead).length;

  return (
    <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const count = countByType(tab.key);
                return (
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
                    {tab.key !== "ALL" && count > 0 ? ` (${count})` : ""}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleMarkAllRead}
              disabled={markingAll || unreadCount === 0}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                No notifications here yet. Approvals, new orders and verified sales will appear here.
              </div>
            ) : (
              filtered.map((notification) => {
                const iconInfo = iconsByType[notification.type] ?? iconsByType.SYSTEM;
                const Icon = iconInfo.icon;

                return (
                  <button
                    key={notification.id}
                    onClick={() => !notification.isRead && handleMarkOneRead(notification.id)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                      notification.isRead ? "border-slate-200 bg-white" : "border-blue-300 bg-blue-50/40"
                    }`}
                  >
                    {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconInfo.style}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{notification.message}</p>
                    </div>
                    {/* Relative time differs by a second or two between the server render
                        and the browser, which is expected. */}
                    <span suppressHydrationWarning className="shrink-0 text-[11px] text-slate-400">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
    </>
  );
}
