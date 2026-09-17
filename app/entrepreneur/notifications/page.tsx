"use client";

import { useEffect, useState } from "react";
import { CircleCheck, MessageCircle, DollarSign, Clock3, type LucideIcon } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type Notification = {
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (response.ok) setNotifications(data.notifications);
    } catch (error) {
      console.error("Load notifications error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkOneRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((previous) => previous.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((previous) => previous.map((n) => ({ ...n, isRead: true })));
  }

  const filtered = activeTab === "ALL" ? notifications : notifications.filter((n) => n.type === activeTab);
  const countByType = (type: TabKey) =>
    type === "ALL"
      ? notifications.filter((n) => !n.isRead).length
      : notifications.filter((n) => n.type === type && !n.isRead).length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Notification Center" />

        <main className="flex-1 overflow-auto px-6 py-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex gap-2">
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
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Mark all as read
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                No notifications here yet.
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
                    <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(notification.createdAt)}</span>
                  </button>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
