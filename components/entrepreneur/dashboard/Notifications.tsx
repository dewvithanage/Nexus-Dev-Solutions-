import Link from "next/link";
import { Bell, Check, MessageCircle, ShoppingBag, X, type LucideIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";

// The signed-in entrepreneur's three most recent notifications, read from
// the database. (Server Component: queries Prisma directly.)
const iconForType: Record<string, { icon: LucideIcon; style: string }> = {
  PRODUCT: { icon: Check, style: "bg-emerald-50 text-emerald-500" },
  ORDER: { icon: ShoppingBag, style: "bg-blue-50 text-blue-500" },
  SYSTEM: { icon: MessageCircle, style: "bg-amber-50 text-amber-500" },
};

export default async function Notifications({ userId }: { userId: string }) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[#101828]">Recent Notifications</h2>
        <Link href="/entrepreneur/notifications" className="text-[11px] font-medium text-blue-600 hover:underline">
          View all
        </Link>
      </div>

      {notifications.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-[11px] text-slate-500">
          <Bell size={18} className="text-slate-300" />
          No notifications yet. Approvals, new orders and verified sales will appear here.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {notifications.map((notification) => {
            const rejected = /reject|not approved/i.test(notification.title);
            const { icon: Icon, style } = rejected
              ? { icon: X, style: "bg-red-50 text-red-500" }
              : iconForType[notification.type] ?? iconForType.SYSTEM;

            return (
              <div key={notification.id} className="flex items-start gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style}`}>
                  <Icon size={13} />
                </div>

                <div className="min-w-0">
                  <p className={`text-[11px] text-slate-800 ${notification.isRead ? "font-medium" : "font-semibold"}`}>
                    {notification.title}
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-slate-500">{notification.message}</p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {notification.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
