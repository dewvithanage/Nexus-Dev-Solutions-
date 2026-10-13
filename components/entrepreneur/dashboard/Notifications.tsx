import Link from "next/link";
import { CircleCheck, MessageCircle, DollarSign, Clock3, type LucideIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";

// Same icon per notification type as the Notification Center page.
const iconsByType: Record<string, { icon: LucideIcon; style: string }> = {
  ORDER: { icon: MessageCircle, style: "bg-amber-50 text-amber-500" },
  PRODUCT: { icon: CircleCheck, style: "bg-blue-50 text-blue-500" },
  SALES: { icon: DollarSign, style: "bg-emerald-50 text-emerald-500" },
  SYSTEM: { icon: Clock3, style: "bg-slate-100 text-slate-500" },
};

// The signed-in entrepreneur's latest notifications, loaded from the
// database (this used to be a hard-coded sample list). The dashboard page
// passes in the user id from the server-side session.
export default async function Notifications({ userId }: { userId: string }) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, type: true, title: true, message: true, isRead: true },
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[#101828]">Recent Notifications</h2>
        <Link
          href="/entrepreneur/notifications"
          className="text-[11px] font-medium text-blue-600 hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {notifications.length === 0 ? (
          <p className="text-[11px] text-slate-500">No notifications yet.</p>
        ) : (
          notifications.map((notification) => {
            const iconInfo = iconsByType[notification.type] ?? iconsByType.SYSTEM;
            const Icon = iconInfo.icon;

            return (
              <div key={notification.id} className="flex items-start gap-3">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconInfo.style}`}
                >
                  <Icon size={13} />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-800">
                    {notification.title}
                    {!notification.isRead && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-600 align-middle" />
                    )}
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-slate-500">{notification.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
