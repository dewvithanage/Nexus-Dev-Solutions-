import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";
import { sessionCookieFor } from "./helpers";

// middleware.ts is what sends a signed-out visitor of an entrepreneur page
// to the login page. These call it the way Next.js does, with a request.

function pageRequest(pathname: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${pathname}`, { headers: cookie ? { cookie } : {} });
}

const entrepreneur = { id: "entrepreneur-1", role: "ENTREPRENEUR" as const };
const admin = { id: "admin-1", role: "ADMIN" as const };

describe("entrepreneur page protection (middleware.ts)", () => {
  it.each([
    "/entrepreneur/dashboard",
    "/entrepreneur/profile",
    "/entrepreneur/products",
    "/entrepreneur/products/add",
    "/entrepreneur/orders",
    "/entrepreneur/notifications",
    "/entrepreneur/sales/some-order/upload",
  ])("redirects a signed-out visitor of %s to the login page", async (pathname) => {
    const response = await middleware(pageRequest(pathname));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/entrepreneur/login");
  });

  it("redirects a forged or tampered session cookie", async () => {
    const cookie = (await sessionCookieFor(entrepreneur)).slice(0, -4) + "AAAA";
    const response = await middleware(pageRequest("/entrepreneur/dashboard", cookie));
    expect(response.status).toBe(307);
  });

  it("redirects an admin session away from entrepreneur pages", async () => {
    const response = await middleware(pageRequest("/entrepreneur/dashboard", await sessionCookieFor(admin)));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/entrepreneur/login");
  });

  it("lets a signed-in entrepreneur through", async () => {
    const response = await middleware(pageRequest("/entrepreneur/dashboard", await sessionCookieFor(entrepreneur)));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["/entrepreneur/login", "/entrepreneur/register", "/entrepreneur/forgot-password", "/entrepreneur/reset-password"])(
    "leaves the public page %s open",
    async (pathname) => {
      const response = await middleware(pageRequest(pathname));
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  );
});
