"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ErrorPanel } from "@/components/entrepreneur/PageStates";

// Catches anything that fails while rendering an entrepreneur page, for
// example the database being unreachable. The visitor sees a plain message
// and a "Try again" button instead of a crash; the real error stays in the
// server log (only its digest reference reaches the browser).
//
// Placed at /entrepreneur so it also covers the (approved) layout's session
// check and the profile and application status pages.
export default function EntrepreneurError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-[#F5F7FA] px-4 py-10">
      <ErrorPanel
        digest={error.digest}
        onRetry={() => {
          // Re-runs the Server Component on the server, then re-renders.
          router.refresh();
          reset();
        }}
      />
    </main>
  );
}
