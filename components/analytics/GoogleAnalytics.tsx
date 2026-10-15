"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { CONSENT_KEY, isTrackedPath, measurementId, pageLocation, type Consent } from "@/lib/analytics";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

function readConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function saveConsent(value: Consent) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
}

// Google Analytics for the public pages, with a consent banner.
//
// - Nothing is loaded from Google until the visitor clicks Accept.
// - Only public storefront pages are counted (see lib/analytics.ts). The
//   script is never loaded on admin, entrepreneur, checkout or order pages,
//   and page views are sent by this component with the query string removed,
//   so tokens and search terms in addresses never reach Google.
// - Off entirely unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
export default function GoogleAnalytics() {
  const id = measurementId();
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [checked, setChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    setChecked(true);
  }, []);

  const tracked = isTrackedPath(pathname);

  // Start once, the first time a consenting visitor is on a public page.
  // gtag queues commands in dataLayer until Google's script arrives.
  useEffect(() => {
    if (!id || consent !== "granted" || !tracked || loaded) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js expects the arguments object itself, not an array.
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
    // No automatic page views: Google would read the full address bar.
    window.gtag("config", id, { send_page_view: false });
    setLoaded(true);
  }, [id, consent, tracked, loaded]);

  // One page view per public page, sent by us with the query string removed.
  useEffect(() => {
    if (!loaded || !tracked || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_location: pageLocation(window.location.origin, pathname),
      page_path: pathname,
      page_title: document.title,
    });
  }, [loaded, tracked, pathname]);

  if (!id) return null;

  function choose(value: Consent) {
    saveConsent(value);
    setConsent(value);
  }

  return (
    <>
      {loaded && <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />}

      {checked && consent === null && tracked && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-700">
              We use Google Analytics cookies to count visits and see which pages are popular. No personal details
              are collected. <Link href="/privacy" className="font-semibold text-blue-700 underline">Privacy notice</Link>
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => choose("denied")}
                className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => choose("granted")}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:flex-none"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
