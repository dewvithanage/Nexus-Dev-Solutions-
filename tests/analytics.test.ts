import { afterEach, describe, expect, it } from "vitest";
import { isTrackedPath, measurementId, pageLocation } from "@/lib/analytics";

// What Google Analytics may see: public pages only, never query strings.

afterEach(() => {
  delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
});

describe("isTrackedPath", () => {
  it.each(["/", "/marketplace", "/marketplace/search", "/products/abc", "/business/xyz", "/about", "/gallery", "/privacy", "/cart"])(
    "counts the public page %s",
    (path) => expect(isTrackedPath(path)).toBe(true)
  );

  it.each([
    "/admin",
    "/admin/login",
    "/admin/entrepreneurs/abc",
    "/entrepreneur/dashboard",
    "/entrepreneur/reset-password",
    "/order-confirmation/abc",
    "/checkout/biz",
    "/api/orders",
  ])("never counts the private page %s", (path) => expect(isTrackedPath(path)).toBe(false));

  it("doesn't mistake look-alike public paths for private ones", () => {
    expect(isTrackedPath("/administrators-guide")).toBe(true);
    expect(isTrackedPath("/entrepreneurs")).toBe(true);
  });
});

describe("pageLocation", () => {
  it("is the origin and path only, so tokens and search terms are never sent", () => {
    expect(pageLocation("https://site.example", "/marketplace/search")).toBe("https://site.example/marketplace/search");
  });
});

describe("measurementId", () => {
  it("is off when not configured or malformed", () => {
    expect(measurementId()).toBeNull();
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-ABC'); alert(1); ('";
    expect(measurementId()).toBeNull();
  });

  it("accepts a real-looking GA4 id", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = " G-AB12CD34EF ";
    expect(measurementId()).toBe("G-AB12CD34EF");
  });
});
