"use client";

import { useEffect, useState } from "react";
import { CONSENT_KEY } from "@/lib/analytics";

// On the privacy page: shows the visitor's current analytics choice and lets
// them clear it, so the banner asks again on the next public page.
export default function ResetAnalyticsChoice() {
  const [choice, setChoice] = useState<string | null>(null);

  useEffect(() => {
    try {
      setChoice(window.localStorage.getItem(CONSENT_KEY));
    } catch {
      setChoice(null);
    }
  }, []);

  function reset() {
    try {
      window.localStorage.removeItem(CONSENT_KEY);
    } catch {
      // Storage blocked: nothing was saved, so there is nothing to clear.
    }
    // Remove Google Analytics cookies (_ga, _ga_<id>) set after an "Accept".
    const domain = window.location.hostname.split(".").slice(-2).join(".");
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (!name.startsWith("_ga")) continue;
      for (const scope of ["", `; domain=${window.location.hostname}`, `; domain=.${domain}`]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${scope}`;
      }
    }
    // Reload so a script loaded after an earlier "Accept" stops running.
    window.location.assign("/");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-700">
        Your current choice:{" "}
        <strong>{choice === "granted" ? "Accepted" : choice === "denied" ? "Declined" : "Not chosen yet"}</strong>
      </span>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
      >
        Change my choice
      </button>
    </div>
  );
}
