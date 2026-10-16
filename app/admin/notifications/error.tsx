"use client";

import AdminPageError from "@/components/admin/AdminPageError";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminPageError title="Admin Notification Dispatch" {...props} />;
}
