// Rules for what Google Analytics may see. Kept separate from the component
// so they can be tested.

// Set in the hosting environment (e.g. Vercel). Without it, analytics is off
// and no banner is shown.
export function measurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id && /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null;
}

// Only the public storefront is counted. Admin and entrepreneur pages are
// private, and the order confirmation and password reset pages carry secret
// tokens in their address, so analytics never runs or reports there.
const PRIVATE_PREFIXES = ["/admin", "/entrepreneur", "/order-confirmation", "/checkout", "/api"];

export function isTrackedPath(pathname: string): boolean {
  return !PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// The address sent to Google: the path only, never the query string
// (?token=..., ?q=... search terms) or the #fragment.
export function pageLocation(origin: string, pathname: string): string {
  return `${origin}${pathname}`;
}

export const CONSENT_KEY = "startupspark-analytics-consent";
export type Consent = "granted" | "denied";
