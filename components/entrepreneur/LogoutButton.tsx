"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/entrepreneur/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      <LogOut size={14} />
      Log out
    </button>
  );
}
