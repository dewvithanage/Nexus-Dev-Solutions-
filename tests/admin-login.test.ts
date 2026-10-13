import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/admin-login/route";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { createAdmin, createEntrepreneur, jsonRequest, resetDatabase, TEST_PASSWORD, userWithSecrets } from "./helpers";

// POST /api/auth/admin-login (Admin Login page)

const adminLogin = (body: unknown) => POST(jsonRequest("/api/auth/admin-login", "POST", body));

beforeEach(resetDatabase);

describe("POST /api/auth/admin-login", () => {
  it("signs an admin in with an httpOnly session cookie carrying their id, role and session version", async () => {
    const admin = await createAdmin();

    const response = await adminLogin({ email: admin.email, password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.httpOnly).toBe(true);
    const session = await verifySessionToken(cookie!.value);
    expect(session).toMatchObject({
      userId: admin.id,
      role: "ADMIN",
      sessionVersion: (await userWithSecrets(admin.id)).sessionVersion,
    });
  });

  it("never returns the password hash", async () => {
    const admin = await createAdmin();
    const response = await adminLogin({ email: admin.email, password: TEST_PASSWORD });
    expect(await response.text()).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it("refuses an entrepreneur account with the same 401 as a wrong password", async () => {
    const entrepreneur = await createEntrepreneur();

    const response = await adminLogin({ email: entrepreneur.email, password: TEST_PASSWORD });

    expect(response.status).toBe(401);
    expect((await response.json()).message).toBe("Invalid email or password.");
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("refuses a wrong password and an unknown email with 401 and no cookie", async () => {
    const admin = await createAdmin();

    const wrongPassword = await adminLogin({ email: admin.email, password: "WrongPass999" });
    const unknownEmail = await adminLogin({ email: "nobody@example.com", password: TEST_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("locks the email after 5 failed attempts, even for the right password, and records it in the database", async () => {
    const admin = await createAdmin();

    for (let i = 0; i < 5; i++) {
      expect((await adminLogin({ email: admin.email, password: "WrongPass999" })).status).toBe(401);
    }
    const response = await adminLogin({ email: admin.email, password: TEST_PASSWORD });

    expect(response.status).toBe(429);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
    const record = await prisma.loginAttempt.findUniqueOrThrow({ where: { key: admin.email.toLowerCase() } });
    expect(record.count).toBe(5);
    expect(record.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("clears the failed-attempt counter after a successful login", async () => {
    const admin = await createAdmin();
    await adminLogin({ email: admin.email, password: "WrongPass999" });

    await adminLogin({ email: admin.email, password: TEST_PASSWORD });

    expect(await prisma.loginAttempt.count()).toBe(0);
  });

  it.each([
    ["an extra role field", (email: string) => ({ email, password: TEST_PASSWORD, role: "ADMIN" })],
    ["a malformed email", () => ({ email: "not-an-email", password: TEST_PASSWORD })],
    ["a missing password", (email: string) => ({ email })],
    ["a non-text password", (email: string) => ({ email, password: { $ne: null } })],
  ])("rejects %s with 400 and no cookie", async (_label, makeBody) => {
    const admin = await createAdmin();

    const response = await adminLogin(makeBody(admin.email));

    expect(response.status).toBe(400);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("rejects a malformed body with 400, not a server error", async () => {
    const response = await POST(
      new (await import("next/server")).NextRequest("http://localhost/api/auth/admin-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      })
    );
    expect(response.status).toBe(400);
  });
});
