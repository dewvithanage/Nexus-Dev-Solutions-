import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { createAdmin, createEntrepreneur, jsonRequest, resetDatabase, TEST_PASSWORD } from "./helpers";

// POST /api/auth/login (entrepreneur sign-in)

const login = (body: unknown) => POST(jsonRequest("/api/auth/login", "POST", body));

beforeEach(resetDatabase);

describe("POST /api/auth/login", () => {
  it("signs in with the right password and sets an httpOnly session cookie for that user", async () => {
    const user = await createEntrepreneur();

    const response = await login({ email: user.email, password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.httpOnly).toBe(true);
    const session = await verifySessionToken(cookie!.value);
    expect(session).toMatchObject({ userId: user.id, role: "ENTREPRENEUR" });
  });

  it("rejects a wrong password with 401 and no cookie", async () => {
    const user = await createEntrepreneur();

    const response = await login({ email: user.email, password: "WrongPass999" });

    expect(response.status).toBe(401);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("does not let an admin account sign in through the entrepreneur login", async () => {
    const admin = await createAdmin();

    const response = await login({ email: admin.email, password: TEST_PASSWORD });

    expect(response.status).toBe(401);
  });

  it("rejects unknown fields such as role with 400", async () => {
    const user = await createEntrepreneur();

    const response = await login({ email: user.email, password: TEST_PASSWORD, role: "ADMIN" });

    expect(response.status).toBe(400);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("rejects a malformed body with 400, not a server error", async () => {
    const response = await login("not an object");
    expect(response.status).toBe(400);
  });

  it("locks the email after 5 failed attempts, even for the right password, and records it in the database", async () => {
    const user = await createEntrepreneur();

    for (let i = 0; i < 5; i++) {
      expect((await login({ email: user.email, password: "WrongPass999" })).status).toBe(401);
    }

    const response = await login({ email: user.email, password: TEST_PASSWORD });

    expect(response.status).toBe(429);
    const record = await prisma.loginAttempt.findUniqueOrThrow({
      where: { key: `entrepreneur-login:${user.email.toLowerCase()}` },
    });
    expect(record.count).toBe(5);
    expect(record.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("clears the failed-attempt counter after a successful login", async () => {
    const user = await createEntrepreneur();
    await login({ email: user.email, password: "WrongPass999" });

    await login({ email: user.email, password: TEST_PASSWORD });

    expect(await prisma.loginAttempt.count()).toBe(0);
  });
});
