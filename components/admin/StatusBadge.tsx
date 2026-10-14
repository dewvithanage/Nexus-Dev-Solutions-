const styles: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-600",
  REJECTED: "bg-red-100 text-red-600",
};

// Approval status pill used on the entrepreneur and product admin pages.
// No "use client": it renders on the server or inside a Client Component.
export default function StatusBadge({
  status,
  label,
  className = "",
}: {
  status: string;
  // Text to show instead of the raw status (e.g. "Active" for APPROVED).
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[9px] font-semibold ${styles[status] ?? "bg-amber-100 text-amber-600"} ${className}`}
    >
      {label ?? status}
    </span>
  );
}
