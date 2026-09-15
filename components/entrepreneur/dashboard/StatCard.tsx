import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBackground?: string;
  iconColor?: string;
};

// Reusable card used to display dashboard statistics
export default function StatCard({
  title,
  value,
  icon: Icon,
  iconBackground = "bg-blue-100",
  iconColor = "text-blue-600",
}: StatCardProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </div>

      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBackground}`}>
        <Icon size={22} className={iconColor} />
      </div>
    </div>
  );
}
