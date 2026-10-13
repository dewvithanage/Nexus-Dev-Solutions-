import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";
import { createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// middleware.ts: protected pages redirect to sign-in, and /api/admin/*
// answers 401 / 403. (Route Handlers check the session again themselves.)

async function visit(pathname: string, role?: "ADMIN" | "ENTREPRENEUR") {
  const headers = new Headers();
  if (role) {
    const token = await createSessionToken({ userId: "test-user", role });
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${token}`);
  }
  return middleware(new NextRequest(new URL(pathname, "http://localhost"), { headers }));
}

describe("middleware", () => {
  it.each([
    ["/admin", "/admin/login"],
    ["/admin/gallery", "/admin/login"],
    ["/entrepreneur/dashboard", "/entrepreneur/login"],
    ["/entrepreneur/products/add", "/entrepreneur/login"],
  ])("redirects %s to %s without a session", async (pathname, loginPath) => {
    const response = await visit(pathname);

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(loginPath);
  });

  it("redirects an entrepreneur away from admin pages", async () => {
    const response = await visit("/admin/gallery", "ENTREPRENEUR");
    expect(new URL(response.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("redirects an admin away from entrepreneur pages", async () => {
    const response = await visit("/entrepreneur/dashboard", "ADMIN");
    expect(new URL(response.headers.get("location")!).pathname).toBe("/entrepreneur/login");
  });

  it("answers 401 for an admin API call without a session", async () => {
    const response = await visit("/api/admin/gallery");
    expect(response.status).toBe(401);
  });

  it("answers 403 for an admin API call from an entrepreneur", async () => {
    const response = await visit("/api/admin/gallery", "ENTREPRENEUR");
    expect(response.status).toBe(403);
  });

  it("treats a forged or tampered cookie as no session", async () => {
    const token = await createSessionToken({ userId: "test-user", role: "ENTREPRENEUR" });
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ userId: "test-user", role: "ADMIN" })).toString("base64url");
    const headers = new Headers({ cookie: `${SESSION_COOKIE_NAME}=${header}.${forgedPayload}.${signature}` });

    const response = await middleware(new NextRequest("http://localhost/api/admin/gallery", { headers }));

    expect(response.status).toBe(401);
  });

  it("lets the sign-in pages through without a session", async () => {
    const response = await visit("/admin/login");
    expect(response.headers.get("location")).toBeNull();
    expect(response.status).toBe(200);
  });
});
