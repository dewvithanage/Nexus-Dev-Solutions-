import { Check, MessageCircle, DollarSign, type LucideIcon } from "lucide-react";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  icon: LucideIcon;
  iconStyle: string;
};

// Sample notifications shown on the dashboard.
// TODO (Sprint 1, Feature 2/Imesha): replace with real Notification rows
// loaded via Prisma — see the team architecture doc.
const notifications: NotificationItem[] = [
  {
    id: 1,
    title: "Product Approved",
    message: "Syllabus Study Planner AI was successfully reviewed.",
    icon: Check,
    iconStyle: "bg-emerald-50 text-emerald-500",
  },
  {
    id: 2,
    title: "New WhatsApp Inquiry",
    message: "Emma Vance wants to coordinate pickup.",
    icon: MessageCircle,
    iconStyle: "bg-blue-50 text-blue-500",
  },
  {
    id: 3,
    title: "Escrow Released",
    message: "$45.00 has been transferred.",
    icon: DollarSign,
    iconStyle: "bg-amber-50 text-amber-500",
  },
];

export default function Notifications() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-[15px] font-bold text-[#101828]">Recent Notifications</h2>

      <div className="mt-4 space-y-4">
        {notifications.map((notification) => {
          const Icon = notification.icon;

          return (
            <div key={notification.id} className="flex items-start gap-3">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${notification.iconStyle}`}
              >
                <Icon size={13} />
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-800">{notification.title}</p>
                <p className="mt-1 text-[9px] leading-4 text-slate-500">{notification.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
